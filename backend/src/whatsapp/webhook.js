import express from "express";
import { prisma } from "../lib/prisma.js";
import { handleIncomingMessage } from "./conversation.js";
import { sendWhatsAppMessage } from "./sendMessage.js";

const router = express.Router();

// Meta calls this once, with a GET, to verify you own the webhook URL.
router.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta POSTs here every time a customer sends a message to the restaurant's
// WhatsApp number.
router.post("/whatsapp", async (req, res) => {
  // Respond immediately - WhatsApp expects a fast 200, retries otherwise.
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return; // could be a status update (delivered/read), ignore

    const phoneNumber = message.from;
    const text = message.text?.body ?? "";
    const businessPhoneId = change.value.metadata.phone_number_id;

    const restaurant = await prisma.restaurant.findFirst({
      where: { whatsappNumber: businessPhoneId },
    });
    if (!restaurant) {
      console.warn(`No restaurant configured for WhatsApp number ${businessPhoneId}`);
      return;
    }

    const { reply, queueChanged } = await handleIncomingMessage({
      restaurantId: restaurant.id,
      phoneNumber,
      text,
    });

    await sendWhatsAppMessage(phoneNumber, reply);

    if (queueChanged) {
      const io = req.app.get("io");
      io.to(`restaurant:${restaurant.id}`).emit("queue:updated");
    }
  } catch (err) {
    console.error("Error handling WhatsApp webhook:", err);
  }
});

export default router;
