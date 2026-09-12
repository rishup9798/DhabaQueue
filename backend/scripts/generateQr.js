import QRCode from "qrcode";
import "dotenv/config";

/**
 * Generates a QR code that deep-links directly into WhatsApp with a
 * pre-filled message - NOT a link to any webpage or form.
 *
 * When a customer scans this at the entrance, their phone opens WhatsApp
 * itself, already composed with "Hi, I'd like to join the queue" ready to
 * send. That single tap is the entire "join" action - the bot picks up
 * from there. This is the core thing that differentiates this system from
 * QR-to-webpage waitlist products: there is no webpage in this flow at all.
 *
 * Usage: node scripts/generateQr.js <whatsapp-number-in-international-format>
 * Example: node scripts/generateQr.js 919876543210
 */
async function main() {
  const whatsappNumber = process.argv[2];

  if (!whatsappNumber) {
    console.error("Usage: node scripts/generateQr.js <whatsapp-number>");
    console.error("Example: node scripts/generateQr.js 919876543210");
    process.exit(1);
  }

  const prefilledMessage = "Hi, I'd like to join the queue";
  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(prefilledMessage)}`;

  const outputPath = "entrance-qr.png";
  await QRCode.toFile(outputPath, waLink, {
    width: 800,
    margin: 2,
  });

  console.log(`QR code saved to ${outputPath}`);
  console.log(`It links to: ${waLink}`);
  console.log("Print this and place it at the entrance/counter.");
  console.log("Scanning it opens WhatsApp directly - no webpage involved.");
}

main();
