import { prisma } from "../lib/prisma.js";
import { estimateWaitMinutes } from "../queue/estimator.js";
import { isAiEnabled, extractIntakeDetails, answerGeneralQuestion } from "./aiAssistant.js";
import { checkAndConsumeAiQuota } from "./aiQuota.js";

export async function handleIncomingMessage({ restaurantId, phoneNumber, text }) {
  const normalized = text.trim().toLowerCase();

  const existingEntry = await prisma.queueEntry.findFirst({
    where: { restaurantId, customerPhoneNumber: phoneNumber, status: { in: ["WAITING", "NOTIFIED", "SEATED"] } },
    orderBy: { joinedAt: "desc" },
  });

  if (existingEntry) {
    if (normalized === "cancel" && existingEntry.status !== "SEATED") {
      await prisma.queueEntry.update({ where: { id: existingEntry.id }, data: { status: "CANCELLED" } });
      await clearConversationState(phoneNumber);
      return { reply: "You've been removed from the queue. Hope to see you again!", queueChanged: true };
    }

    if (existingEntry.status === "NOTIFIED") {
      return { reply: "Your table is ready! Please proceed to the restaurant and check in with the staff.", queueChanged: false };
    }

    if (existingEntry.status === "SEATED") {
      const foodOrder = await prisma.foodOrder.findUnique({ where: { queueEntryId: existingEntry.id } });
      if (foodOrder) return { reply: `You're seated. Your food order is currently ${foodOrder.status.toLowerCase()}.`, queueChanged: false };
      return { reply: "You're already seated. Please ask our staff if you need anything.", queueChanged: false };
    }

    if (normalized !== "status" && !looksLikeStatusRequest(normalized)) {
      if (await canUseAi(phoneNumber, restaurantId)) {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        const queueLength = await prisma.queueEntry.count({ where: { restaurantId, status: "WAITING" } });
        const reply = await answerGeneralQuestion(text, {
          restaurantName: restaurant.name,
          queueLength,
          avgWaitMinutes: existingEntry.estimatedWaitMinutes,
        });
        return { reply, queueChanged: false };
      }
    }

    const position = await getQueuePosition(restaurantId, existingEntry.id);
    return { reply: `You're #${position} in line. Estimated wait: ~${existingEntry.estimatedWaitMinutes} min. Reply "status" anytime, or "cancel" to leave the queue.`, queueChanged: false };
  }

  const state = await prisma.conversationState.findUnique({ where: { phoneNumber } });
  const customer = await prisma.customer.findUnique({ where: { phoneNumber } });

  if (!state) {
    if (customer?.name) {
      if (await canUseAi(phoneNumber, restaurantId)) {
        const { partySize } = await extractIntakeDetails(text);
        if (partySize) return startQueueEntry({ restaurantId, phoneNumber, partySize, name: customer.name });
      }

      await prisma.conversationState.create({ data: { phoneNumber, restaurantId, step: "AWAITING_PARTY_SIZE" } });
      return { reply: `Welcome back, ${customer.name}! How many people in your party today?`, queueChanged: false };
    }

    if (await canUseAi(phoneNumber, restaurantId)) {
      const { name, partySize } = await extractIntakeDetails(text);
      if (name && partySize) return startQueueEntry({ restaurantId, phoneNumber, partySize, name });

      if (name) {
        await prisma.customer.upsert({ where: { phoneNumber }, update: { name }, create: { phoneNumber, name, visitCount: 0 } });
        await prisma.conversationState.create({ data: { phoneNumber, restaurantId, step: "AWAITING_PARTY_SIZE" } });
        return { reply: `Thanks, ${name}! How many people are in your party?`, queueChanged: false };
      }
    }

    await prisma.conversationState.create({ data: { phoneNumber, restaurantId, step: "AWAITING_NAME" } });
    return { reply: "Welcome! What name should we put your table under?", queueChanged: false };
  }

  if (state.step === "AWAITING_NAME") {
    let name = text.trim().slice(0, 60);
    let partySize = null;

    if (await canUseAi(phoneNumber, restaurantId)) {
      const extracted = await extractIntakeDetails(text);
      if (extracted.name) name = extracted.name;
      partySize = extracted.partySize;
    }

    if (!name) return { reply: "Just your name is fine, e.g. Ramesh", queueChanged: false };
    if (partySize) return startQueueEntry({ restaurantId, phoneNumber, partySize, name });

    await prisma.customer.upsert({
      where: { phoneNumber },
      update: { name },
      create: { phoneNumber, name, visitCount: 0 },
    });
    await prisma.conversationState.update({ where: { phoneNumber }, data: { step: "AWAITING_PARTY_SIZE" } });
    return { reply: `Thanks, ${name}! How many people are in your party?`, queueChanged: false };
  }

  if (state.step === "AWAITING_PARTY_SIZE") {
    let partySize = parseInt(normalized, 10);
    if ((!partySize || partySize < 1 || partySize > 30) && (await canUseAi(phoneNumber, restaurantId))) {
      const extracted = await extractIntakeDetails(text);
      if (extracted.partySize) partySize = extracted.partySize;
    }
    if (!partySize || partySize < 1 || partySize > 30) return { reply: "Please reply with just a number for your party size, e.g. 4", queueChanged: false };
    return startQueueEntry({ restaurantId, phoneNumber, partySize, name: customer?.name });
  }

  return { reply: 'Reply "status" to check your position, or "cancel" to leave the queue.', queueChanged: false };
}

async function canUseAi(phoneNumber, restaurantId) {
  return isAiEnabled() && (await checkAndConsumeAiQuota(phoneNumber, restaurantId));
}

function looksLikeStatusRequest(normalized) {
  return ["status", "position", "how long", "update"].some((phrase) => normalized.includes(phrase));
}

async function startQueueEntry({ restaurantId, phoneNumber, partySize, name }) {
  const waitMinutes = await estimateWaitMinutes(restaurantId, partySize);
  const customer = await prisma.customer.upsert({
    where: { phoneNumber },
    update: { name: name || undefined, visitCount: { increment: 1 } },
    create: { phoneNumber, name: name || "Guest", visitCount: 1 },
  });

  const queueEntry = await prisma.queueEntry.create({
    data: {
      restaurantId,
      customerPhoneNumber: customer.phoneNumber,
      partySize,
      estimatedWaitMinutes: waitMinutes,
      status: "WAITING",
      source: "WHATSAPP",
    },
  });

  await clearConversationState(phoneNumber);
  const position = await getQueuePosition(restaurantId, queueEntry.id);
  return { reply: `You're in the queue! 🎉 You're #${position} in line for ${partySize} people. Estimated wait: ~${waitMinutes} min. We'll message you when your table is ready.`, queueChanged: true };
}

async function getQueuePosition(restaurantId, queueEntryId) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry) return 0;
  return prisma.queueEntry.count({ where: { restaurantId, status: "WAITING", joinedAt: { lte: entry.joinedAt } } });
}

async function clearConversationState(phoneNumber) {
  await prisma.conversationState.deleteMany({ where: { phoneNumber } });
}
