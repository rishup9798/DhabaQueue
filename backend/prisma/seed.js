import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { whatsappNumber: "demo-phone-number-id" },
    update: {},
    create: {
      name: "Shanti Dhaba",
      whatsappNumber: "demo-phone-number-id", // replace with your real WHATSAPP_PHONE_NUMBER_ID
      avgTurnoverMinutes: 25,
      tables: {
        create: [
          { number: 1, capacity: 2 },
          { number: 2, capacity: 4 },
          { number: 3, capacity: 4 },
          { number: 4, capacity: 6 },
        ],
      },
    },
  });

  const email = "owner@shantidhaba.test";
  const password = "queuechat123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staffUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, restaurantId: restaurant.id },
  });

  console.log("Seeded demo restaurant:", restaurant.name);
  console.log("Staff login ->", email, "/", password);
  console.log("");
  console.log("Next: generate the entrance QR with:");
  console.log("  npm run generate:qr -- <your-real-whatsapp-number>");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
