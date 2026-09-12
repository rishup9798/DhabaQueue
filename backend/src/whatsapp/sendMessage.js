import axios from "axios";

export async function sendWhatsAppMessage(toPhoneNumber, body) {
  if (process.env.DEMO_MODE === "true") {
    console.log("\n========== DEMO WHATSAPP ==========");
    console.log(`To: ${toPhoneNumber}`);
    console.log(`Message: ${body}`);
    console.log("===================================\n");
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to: toPhoneNumber,
      type: "text",
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}