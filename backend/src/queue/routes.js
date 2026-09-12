import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { sendWhatsAppMessage } from "../whatsapp/sendMessage.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { estimateWaitMinutes } from "./estimator.js";

const router = express.Router();

// All routes here are staff-only.
router.use(requireAuth);

function broadcastQueueUpdate(req, restaurantId) {
  const io = req.app.get("io");
  io.to(`restaurant:${restaurantId}`).emit("queue:updated");
}

// GET /api/queue - the live waiting list for the logged-in staff member's restaurant
router.get("/", asyncHandler(async (req, res) => {
  const entries = await prisma.queueEntry.findMany({
    where: { restaurantId: req.staff.restaurantId, status: "WAITING" },
    orderBy: { joinedAt: "asc" },
    include: { customer: true },
  });
  res.json(entries);
}));

// POST /api/queue/manual - staff adds a walk-in directly from the dashboard,
// for customers who don't want to (or can't) use WhatsApp. Phone is optional;
// if omitted, a synthetic identifier is used so the DB's phone-based identity
// model still works, but no WhatsApp messages can be sent to that entry.
router.post("/manual", asyncHandler(async (req, res) => {
  const { name, partySize, phoneNumber } = req.body;

  if (!name || !partySize) {
    return res.status(400).json({ error: "name and partySize are required" });
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 30) {
    return res.status(400).json({ error: "partySize must be a whole number between 1 and 30" });
  }

  const restaurantId = req.staff.restaurantId;
  const isWalkIn = !phoneNumber;
  const identifier = phoneNumber || `walkin:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  await prisma.customer.upsert({
    where: { phoneNumber: identifier },
    update: { name, visitCount: { increment: 1 }, lastVisitAt: new Date() },
    create: { phoneNumber: identifier, name, visitCount: 1, lastVisitAt: new Date(), isWalkIn },
  });

  const estimatedWaitMinutes = await estimateWaitMinutes(restaurantId, partySize);

  const entry = await prisma.queueEntry.create({
    data: {
      restaurantId,
      customerPhoneNumber: identifier,
      partySize,
      estimatedWaitMinutes,
      status: "WAITING",
      source: "STAFF_MANUAL",
    },
    include: { customer: true },
  });

  broadcastQueueUpdate(req, restaurantId);
  res.status(201).json(entry);
}));

// PATCH /api/queue/:id/notify - tell the customer their table is ready.
// Skipped for walk-ins with no real WhatsApp number - staff just calls them.
router.patch("/:id/notify", asyncHandler(async (req, res) => {
  const entry = await prisma.queueEntry.update({
    where: { id: req.params.id },
    data: { status: "NOTIFIED", notifiedAt: new Date() },
    include: { customer: true },
  });

  if (!entry.customer.isWalkIn) {
    await sendWhatsAppMessage(
      entry.customerPhoneNumber,
      "Your table is ready! Please head to the counter. 🎉"
    );
  }

  broadcastQueueUpdate(req, entry.restaurantId);
  res.json(entry);
}));

// PATCH /api/queue/:id/seat - mark seated, frees up capacity for the next
// estimate, and creates an empty food order ready for staff to fill in.
router.patch("/:id/seat", asyncHandler(async (req, res) => {
  const entry = await prisma.queueEntry.update({
    where: { id: req.params.id },
    data: { status: "SEATED", seatedAt: new Date() },
  });

  await prisma.foodOrder.upsert({
    where: { queueEntryId: entry.id },
    update: {},
    create: { queueEntryId: entry.id, itemsSummary: "", status: "ORDERED" },
  });

  broadcastQueueUpdate(req, entry.restaurantId);
  res.json(entry);
}));

// PATCH /api/queue/:id/remove - no-show or manual removal
router.patch("/:id/remove", asyncHandler(async (req, res) => {
  const entry = await prisma.queueEntry.update({
    where: { id: req.params.id },
    data: { status: "NO_SHOW" },
  });
  broadcastQueueUpdate(req, entry.restaurantId);
  res.json(entry);
}));

// GET /api/tables - table grid for the dashboard's second view
router.get("/tables/all", asyncHandler(async (req, res) => {
  const tables = await prisma.table.findMany({
    where: { restaurantId: req.staff.restaurantId },
    orderBy: { number: "asc" },
  });
  res.json(tables);
}));

// PATCH /api/tables/:id/toggle - flip a table between free/occupied
router.patch("/tables/:id/toggle", asyncHandler(async (req, res) => {
  const table = await prisma.table.findUnique({ where: { id: req.params.id } });
  if (!table) {
    return res.status(404).json({ error: "Table not found" });
  }
  const updated = await prisma.table.update({
    where: { id: req.params.id },
    data: { status: table.status === "FREE" ? "OCCUPIED" : "FREE" },
  });
  broadcastQueueUpdate(req, updated.restaurantId);
  res.json(updated);
}));

// GET /api/queue/food-orders - all in-progress food orders for seated tables
router.get("/food-orders", asyncHandler(async (req, res) => {
  const orders = await prisma.foodOrder.findMany({
    where: {
      status: { not: "SERVED" },
      queueEntry: { restaurantId: req.staff.restaurantId },
    },
    include: { queueEntry: { include: { customer: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(orders);
}));

// PATCH /api/queue/food-orders/:id - update items and/or status. When status
// flips to READY, proactively notifies the customer over WhatsApp (skipped
// for walk-ins without a real number).
router.patch("/food-orders/:id", asyncHandler(async (req, res) => {
  const { itemsSummary, status } = req.body;

  const existing = await prisma.foodOrder.findUnique({
    where: { id: req.params.id },
    include: { queueEntry: { include: { customer: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Food order not found" });

  const updated = await prisma.foodOrder.update({
    where: { id: req.params.id },
    data: {
      ...(itemsSummary !== undefined ? { itemsSummary } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(status === "READY" ? { readyNotifiedAt: new Date() } : {}),
    },
  });

  const justBecameReady = status === "READY" && existing.status !== "READY";
  if (justBecameReady && !existing.queueEntry.customer.isWalkIn) {
    await sendWhatsAppMessage(
      existing.queueEntry.customerPhoneNumber,
      "Your food is ready! 🍽️ Enjoy your meal."
    );
  }

  broadcastQueueUpdate(req, existing.queueEntry.restaurantId);
  res.json(updated);
}));

export default router;
