import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";

import whatsappWebhook from "./whatsapp/webhook.js";
import queueRoutes from "./queue/routes.js";
import authRoutes from "./auth/routes.js";
import { prisma } from "./lib/prisma.js";
import { refreshAtRiskFlags } from "./queue/estimator.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_ORIGIN, methods: ["GET", "POST"] },
});
app.set("io", io);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());

// Meta calls the webhook without our frontend's CORS context, so it's
// registered before any auth-required middleware.
//
// Rate limited per-IP as a basic guard against someone scripting fake
// messages to flood the queue - WhatsApp itself sends from a small set of
// Meta IPs so this mainly protects against direct hits to the endpoint.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/webhook", webhookLimiter, whatsappWebhook);

app.use("/api/auth", authRoutes);
app.use("/api/queue", queueRoutes);

// Must come after every real route: catches unmatched paths, then any error
// thrown or rejected by a route handler above.
app.use(notFoundHandler);
app.use(errorHandler);

// Staff dashboard clients join a room scoped to their restaurant so they
// only receive updates relevant to them.
io.on("connection", (socket) => {
  socket.on("join-restaurant", (restaurantId) => {
    socket.join(`restaurant:${restaurantId}`);
  });
});

// Every 60s, recompute which waiting parties have exceeded their estimated
// wait so the "at risk" highlight stays accurate even with no new actions.
setInterval(async () => {
  const restaurants = await prisma.restaurant.findMany({ select: { id: true } });
  for (const r of restaurants) {
    const changed = await refreshAtRiskFlags(r.id);
    if (changed) io.to(`restaurant:${r.id}`).emit("queue:updated");
  }
}, 60_000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`QueueChat backend running on http://localhost:${PORT}`);
});
