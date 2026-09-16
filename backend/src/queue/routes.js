import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendWhatsAppMessage } from "../whatsapp/sendMessage.js";

const router = express.Router();
const prisma = new PrismaClient();

function broadcastQueueUpdate(req, restaurantId) {
  const io = req.app.get("io");

  if (io) {
    io.to(`restaurant:${restaurantId}`).emit("queue:update");
  }
}

/* =========================
   GET ACTIVE QUEUE
========================= */
router.get("/", requireAuth, async (req, res) => {
  try {
    const entries = await prisma.queueEntry.findMany({
      where: {
        restaurantId: req.staff.restaurantId,
        status: {
          in: ["WAITING", "NOTIFIED", "SEATED"],
        },
      },
      include: {
        customer: true,
        table: true,
        foodOrder: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    res.json(entries);
  } catch (error) {
    console.error("GET QUEUE ERROR:", error);
    res.status(500).json({ error: "Failed to load queue" });
  }
});

/* =========================
   ADD CUSTOMER MANUALLY
========================= */
router.post("/manual", requireAuth, async (req, res) => {
  try {
    const { name, phoneNumber, partySize } = req.body;

    if (!name || !phoneNumber || !partySize) {
      return res.status(400).json({
        error: "Name, phone number and party size are required",
      });
    }

    const restaurantId = req.staff.restaurantId;

    const customer = await prisma.customer.upsert({
      where: {
        phoneNumber,
      },
      update: {
        name,
      },
      create: {
        phoneNumber,
        name,
        isWalkIn: true,
      },
    });

    const waitingCount = await prisma.queueEntry.count({
      where: {
        restaurantId,
        status: {
          in: ["WAITING", "NOTIFIED"],
        },
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
    });

    const estimatedWaitMinutes =
      waitingCount * (restaurant?.avgTurnoverMinutes || 25);

    const entry = await prisma.queueEntry.create({
      data: {
        restaurantId,
        customerPhoneNumber: customer.phoneNumber,
        partySize: Number(partySize),
        estimatedWaitMinutes,
        source: "STAFF_MANUAL",
      },
      include: {
        customer: true,
        table: true,
        foodOrder: true,
      },
    });

    broadcastQueueUpdate(req, restaurantId);

    res.status(201).json(entry);
  } catch (error) {
    console.error("MANUAL QUEUE ERROR:", error);
    res.status(500).json({ error: "Failed to add customer" });
  }
});

/* =========================
   NOTIFY CUSTOMER
========================= */
router.patch("/:id/notify", requireAuth, async (req, res) => {
  try {
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
        table: true,
        foodOrder: true,
      },
    });

    if (!entry.customer.isWalkIn) {
      try {
        await sendWhatsAppMessage(
          entry.customerPhoneNumber,
          "Your table is ready! Please head to the counter. 🎉"
        );
      } catch (whatsappError) {
        console.error("WHATSAPP NOTIFY ERROR:", whatsappError);
      }
    }

    broadcastQueueUpdate(req, entry.restaurantId);

    res.json(updated);
  } catch (error) {
    console.error("NOTIFY ERROR:", error);
    res.status(500).json({ error: "Failed to notify customer" });
  }
});

/* =========================
   AUTOMATIC TABLE ASSIGNMENT
========================= */
router.patch("/:id/seat", requireAuth, async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;

    const entry = await prisma.queueEntry.findFirst({
      where: {
        id: req.params.id,
        restaurantId,
        status: {
          in: ["WAITING", "NOTIFIED"],
        },
      },
      include: {
        customer: true,
      },
    });

    if (!entry) {
      return res.status(404).json({
        error: "Queue entry not found or customer is already seated",
      });
    }

    const table = await prisma.table.findFirst({
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

    if (!table) {
      return res.status(409).json({
        error: `No free table is available for a party of ${entry.partySize}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const occupiedTable = await tx.table.update({
        where: {
          id: table.id,
        },
        data: {
          status: "OCCUPIED",
        },
      });

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

      await tx.foodOrder.create({
        data: {
          queueEntryId: entry.id,
          itemsSummary: "",
          status: "ORDERED",
        },
      });

      return {
        entry: updatedEntry,
        table: occupiedTable,
      };
    });

    broadcastQueueUpdate(req, restaurantId);

    res.json(result.entry);
  } catch (error) {
    console.error("SEAT ERROR:", error);
    res.status(500).json({
      error: "Failed to assign table",
    });
  }
});

/* =========================
   REMOVE / NO SHOW
========================= */
router.patch("/:id/remove", requireAuth, async (req, res) => {
  try {
    const entry = await prisma.queueEntry.findFirst({
      where: {
        id: req.params.id,
        restaurantId: req.staff.restaurantId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        error: "Queue entry not found",
      });
    }

    if (
      entry.status === "NO_SHOW" ||
      entry.status === "COMPLETED"
    ) {
      return res.json(entry);
    }

    if (entry.status === "SEATED") {
      return res.status(409).json({
        error: "Seated customers cannot be removed from the queue",
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
  } catch (error) {
    console.error("REMOVE ERROR:", error);
    res.status(500).json({
      error: "Failed to remove customer",
    });
  }
});

/* =========================
   GET ALL TABLES
========================= */
router.get("/tables/all", requireAuth, async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: req.staff.restaurantId,
      },
      include: {
        queueEntries: {
          where: {
            status: "SEATED",
          },
          include: {
            customer: true,
            foodOrder: true,
          },
          orderBy: {
            seatedAt: "desc",
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    res.json(tables);
  } catch (error) {
    console.error("TABLES ERROR:", error);
    res.status(500).json({
      error: "Failed to load tables",
    });
  }
});

/* =========================
   GET ACTIVE FOOD ORDERS
========================= */
router.get("/food-orders", requireAuth, async (req, res) => {
  try {
    const orders = await prisma.foodOrder.findMany({
      where: {
        queueEntry: {
          restaurantId: req.staff.restaurantId,
        },
        status: {
          not: "SERVED",
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
  } catch (error) {
    console.error("FOOD ORDERS ERROR:", error);
    res.status(500).json({
      error: "Failed to load food orders",
    });
  }
});

/* =========================
   FOOD ORDER HISTORY
========================= */
router.get("/food-orders/history", requireAuth, async (req, res) => {
  try {
    const orders = await prisma.foodOrder.findMany({
      where: {
        queueEntry: {
          restaurantId: req.staff.restaurantId,
        },
        status: "SERVED",
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
  } catch (error) {
    console.error("FOOD HISTORY ERROR:", error);
    res.status(500).json({
      error: "Failed to load food history",
    });
  }
});

/* =========================
   UPDATE FOOD ORDER
========================= */
router.patch(
  "/food-orders/:id",
  requireAuth,
  async (req, res) => {
    try {
      const { status, itemsSummary } = req.body;

      const order = await prisma.foodOrder.findFirst({
        where: {
          id: req.params.id,
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
      });

      if (!order) {
        return res.status(404).json({
          error: "Food order not found",
        });
      }

      /* =========================
         UPDATE FOOD ITEMS
      ========================= */
      if (itemsSummary !== undefined) {
        const updatedOrder = await prisma.foodOrder.update({
          where: {
            id: order.id,
          },
          data: {
            itemsSummary,
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

        broadcastQueueUpdate(req, req.staff.restaurantId);

        return res.json(updatedOrder);
      }

      if (!status) {
        return res.status(400).json({
          error: "Status is required",
        });
      }

      const validStatuses = [
        "ORDERED",
        "PREPARING",
        "READY",
        "SERVED",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid food status",
        });
      }

      /* =========================
         READY
      ========================= */
      if (status === "READY") {
        const updatedOrder = await prisma.foodOrder.update({
          where: {
            id: order.id,
          },
          data: {
            status: "READY",
            readyNotifiedAt: new Date(),
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

        if (!order.queueEntry.customer.isWalkIn) {
          try {
            await sendWhatsAppMessage(
              order.queueEntry.customerPhoneNumber,
              `Your food is ready! 🍽️ Please collect it from Table ${
                order.queueEntry.table?.number || "the counter"
              }.`
            );
          } catch (whatsappError) {
            console.error(
              "WHATSAPP READY ERROR:",
              whatsappError
            );
          }
        }

        broadcastQueueUpdate(req, req.staff.restaurantId);

        return res.json(updatedOrder);
      }

      /* =========================
         SERVED
      ========================= */
      if (status === "SERVED") {
        const result = await prisma.$transaction(async (tx) => {
          const updatedOrder = await tx.foodOrder.update({
            where: {
              id: order.id,
            },
            data: {
              status: "SERVED",
              servedAt: new Date(),
            },
            include: {
              queueEntry: true,
            },
          });

          const updatedEntry = await tx.queueEntry.update({
            where: {
              id: order.queueEntryId,
            },
            data: {
              status: "COMPLETED",
            },
          });

          if (order.queueEntry.tableId) {
            await tx.table.update({
              where: {
                id: order.queueEntry.tableId,
              },
              data: {
                status: "FREE",
              },
            });
          }

          return {
            order: updatedOrder,
            entry: updatedEntry,
          };
        });

        broadcastQueueUpdate(req, req.staff.restaurantId);

        return res.json(result.order);
      }

      /* =========================
         ORDERED / PREPARING
      ========================= */
      const updatedOrder = await prisma.foodOrder.update({
        where: {
          id: order.id,
        },
        data: {
          status,
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

      broadcastQueueUpdate(req, req.staff.restaurantId);

      res.json(updatedOrder);
    } catch (error) {
      console.error("FOOD UPDATE ERROR:", error);
      res.status(500).json({
        error: "Failed to update food order",
      });
    }
  }
);

export default router;