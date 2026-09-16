import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { sendWhatsAppMessage } from "../whatsapp/sendMessage.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { estimateWaitMinutes } from "./estimator.js";

const router = express.Router();

router.use(requireAuth);

function broadcastQueueUpdate(req, restaurantId) {
  const io = req.app.get("io");
  io.to(`restaurant:${restaurantId}`).emit("queue:updated");
}

// GET /api/queue
// Returns the active queue in FCFS order.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const entries = await prisma.queueEntry.findMany({
      where: {
        restaurantId: req.staff.restaurantId,
        status: {
          in: ["WAITING", "NOTIFIED", "SEATED"],
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
      include: {
        customer: true,
        table: true,
        foodOrder: true,
      },
    });

    res.json(entries);
  })
);

// POST /api/queue/manual
// Staff manually adds a walk-in.
router.post(
  "/manual",
  asyncHandler(async (req, res) => {
    const { name, partySize, phoneNumber } = req.body;

    if (!name || !partySize) {
      return res.status(400).json({
        error: "name and partySize are required",
      });
    }

    if (
      !Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > 30
    ) {
      return res.status(400).json({
        error: "partySize must be a whole number between 1 and 30",
      });
    }

    const restaurantId = req.staff.restaurantId;

    const isWalkIn = !phoneNumber;

    const identifier =
      phoneNumber ||
      `walkin:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    await prisma.customer.upsert({
      where: {
        phoneNumber: identifier,
      },
      update: {
        name,
        visitCount: {
          increment: 1,
        },
        lastVisitAt: new Date(),
      },
      create: {
        phoneNumber: identifier,
        name,
        visitCount: 1,
        lastVisitAt: new Date(),
        isWalkIn,
      },
    });

    const estimatedWaitMinutes = await estimateWaitMinutes(
      restaurantId,
      partySize
    );

    const entry = await prisma.queueEntry.create({
      data: {
        restaurantId,
        customerPhoneNumber: identifier,
        partySize,
        estimatedWaitMinutes,
        status: "WAITING",
        source: "STAFF_MANUAL",
      },
      include: {
        customer: true,
      },
    });

    broadcastQueueUpdate(req, restaurantId);

    res.status(201).json(entry);
  })
);

// PATCH /api/queue/:id/notify
// Notify the next customer that their table is ready.
router.patch(
  "/:id/notify",
  asyncHandler(async (req, res) => {
    const entry = await prisma.queueEntry.findFirst({
      where: {
        id: req.params.id,
        restaurantId: req.staff.restaurantId,
        status: "WAITING",
      },
      include: {
        customer: true,
      },
    });

    if (!entry) {
      return res.status(404).json({
        error: "Queue entry not found or already notified",
      });
    }

    const updated = await prisma.queueEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        status: "NOTIFIED",
        notifiedAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    if (!entry.customer.isWalkIn) {
      await sendWhatsAppMessage(
        entry.customerPhoneNumber,
        "Your table is ready! Please head to the counter. 🎉"
      );
    }

    broadcastQueueUpdate(req, entry.restaurantId);

    res.json(updated);
  })
);

// PATCH /api/queue/:id/seat
// Automatically selects the smallest suitable FREE table.
router.patch(
  "/:id/seat",
  asyncHandler(async (req, res) => {
    const restaurantId = req.staff.restaurantId;

    const entry = await prisma.queueEntry.findFirst({
      where: {
        id: req.params.id,
        restaurantId,
        status: "NOTIFIED",
      },
      include: {
        customer: true,
      },
    });

    if (!entry) {
      return res.status(404).json({
        error:
          "Queue entry not found or customer is not ready to be seated",
      });
    }

    // Find the smallest available table that can accommodate
    // the complete party.
    const availableTables = await prisma.table.findMany({
      where: {
        restaurantId,
        status: "FREE",
        capacity: {
          gte: entry.partySize,
        },
      },
      orderBy: [
        {
          capacity: "asc",
        },
        {
          number: "asc",
        },
      ],
    });

    const table = availableTables[0];

    if (!table) {
      return res.status(409).json({
        error: `No suitable table is currently available for ${entry.partySize} guests`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Occupy the selected table.
      const updatedTable = await tx.table.update({
        where: {
          id: table.id,
        },
        data: {
          status: "OCCUPIED",
        },
      });

      // Seat the customer and remember the table assignment.
      const updatedEntry = await tx.queueEntry.update({
        where: {
          id: entry.id,
        },
        data: {
          status: "SEATED",
          seatedAt: new Date(),
          tableId: table.id,
        },
        include: {
          customer: true,
          table: true,
        },
      });

      // Automatically create an empty food order.
      const foodOrder = await tx.foodOrder.upsert({
        where: {
          queueEntryId: entry.id,
        },
        update: {},
        create: {
          queueEntryId: entry.id,
          itemsSummary: "",
          status: "ORDERED",
        },
      });

      return {
        entry: updatedEntry,
        table: updatedTable,
        foodOrder,
      };
    });

    broadcastQueueUpdate(req, restaurantId);

    res.json(result.entry);
  })
);

// PATCH /api/queue/:id/remove
// Mark a waiting customer as a no-show.
router.patch(
  "/:id/remove",
  asyncHandler(async (req, res) => {
    const entry = await prisma.queueEntry.findFirst({
      where: {
        id: req.params.id,
        restaurantId: req.staff.restaurantId,
        status: {
          in: ["WAITING", "NOTIFIED"],
        },
      },
    });

    if (!entry) {
      return res.status(404).json({
        error: "Queue entry not found",
      });
    }

    const updated = await prisma.queueEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        status: "NO_SHOW",
      },
    });

    broadcastQueueUpdate(req, entry.restaurantId);

    res.json(updated);
  })
);

// GET /api/queue/tables/all
// Returns all tables with their currently seated customer.
router.get(
  "/tables/all",
  asyncHandler(async (req, res) => {
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: req.staff.restaurantId,
      },
      orderBy: {
        number: "asc",
      },
      include: {
        queueEntries: {
          where: {
            status: "SEATED",
          },
          orderBy: {
            seatedAt: "desc",
          },
          take: 1,
          include: {
            customer: true,
            foodOrder: true,
          },
        },
      },
    });

    res.json(tables);
  })
);

// GET /api/queue/food-orders
// Returns active food orders.
router.get(
  "/food-orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.foodOrder.findMany({
      where: {
        status: {
          not: "SERVED",
        },
        queueEntry: {
          restaurantId: req.staff.restaurantId,
        },
      },
      include: {
        queueEntry: {
          include: {
            customer: true,
            table: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(orders);
  })
);

// GET /api/queue/food-orders/history
// Returns served food orders.
router.get(
  "/food-orders/history",
  asyncHandler(async (req, res) => {
    const orders = await prisma.foodOrder.findMany({
      where: {
        status: "SERVED",
        queueEntry: {
          restaurantId: req.staff.restaurantId,
        },
      },
      include: {
        queueEntry: {
          include: {
            customer: true,
            table: true,
          },
        },
      },
      orderBy: {
        servedAt: "desc",
      },
    });

    res.json(orders);
  })
);

// PATCH /api/queue/food-orders/:id
// Staff updates food items/status.
router.patch(
  "/food-orders/:id",
  asyncHandler(async (req, res) => {
    const { itemsSummary, status } = req.body;

    const existing = await prisma.foodOrder.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        queueEntry: {
          include: {
            customer: true,
            table: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Food order not found",
      });
    }

    if (
      existing.queueEntry.restaurantId !== req.staff.restaurantId
    ) {
      return res.status(403).json({
        error: "You do not have access to this food order",
      });
    }

    const justBecameReady =
      status === "READY" && existing.status !== "READY";

    const justBecameServed =
      status === "SERVED" && existing.status !== "SERVED";

    if (status === "SERVED") {
      if (!existing.queueEntry.tableId) {
        return res.status(400).json({
          error: "Cannot complete order because no table is assigned",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.foodOrder.update({
          where: {
            id: existing.id,
          },
          data: {
            ...(itemsSummary !== undefined
              ? { itemsSummary }
              : {}),
            status: "SERVED",
            servedAt: new Date(),
          },
        });

        await tx.queueEntry.update({
          where: {
            id: existing.queueEntryId,
          },
          data: {
            status: "COMPLETED",
          },
        });

        await tx.table.update({
          where: {
            id: existing.queueEntry.tableId,
          },
          data: {
            status: "FREE",
          },
        });

        return updatedOrder;
      });

      broadcastQueueUpdate(
        req,
        existing.queueEntry.restaurantId
      );

      return res.json(result);
    }

    const updated = await prisma.foodOrder.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(itemsSummary !== undefined
          ? { itemsSummary }
          : {}),
        ...(status !== undefined
          ? { status }
          : {}),
        ...(status === "READY"
          ? { readyNotifiedAt: new Date() }
          : {}),
      },
    });

    if (
      justBecameReady &&
      !existing.queueEntry.customer.isWalkIn
    ) {
      await sendWhatsAppMessage(
        existing.queueEntry.customerPhoneNumber,
        "Your food is ready! 🍽️ Enjoy your meal."
      );
    }

    broadcastQueueUpdate(
      req,
      existing.queueEntry.restaurantId
    );

    res.json(updated);
  })
);

export default router;