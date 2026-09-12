import { prisma } from "../lib/prisma.js";
import { evaluateQuota } from "./quotaDecision.js";

/**
 * Checks (and, if allowed, consumes) one unit of AI quota for this message.
 * Two independent caps apply - both must pass:
 *  - per-customer: stops one phone number from spamming the bot into
 *    running up API cost
 *  - per-restaurant: a hard backstop on total daily AI spend regardless of
 *    how many distinct customers are messaging in
 *
 * Fails safe: if anything goes wrong reading/writing quota state, AI use is
 * denied for that message rather than risking an uncapped call - the
 * conversation just falls back to the rigid step-by-step flow.
 */
export async function checkAndConsumeAiQuota(phoneNumber, restaurantId) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const restaurantDecision = evaluateQuota({
      callsToday: restaurant.aiCallsToday,
      resetAt: restaurant.aiCallsResetAt,
      dailyLimit: restaurant.aiDailyLimit,
    });

    if (!restaurantDecision.allowed) {
      console.warn(`Restaurant ${restaurantId} hit its daily AI call limit (${restaurant.aiDailyLimit}).`);
      return false;
    }

    // Customer row may not exist yet on someone's very first message ever -
    // treat that as a fresh quota window.
    const customer = await prisma.customer.findUnique({ where: { phoneNumber } });
    const customerDecision = evaluateQuota({
      callsToday: customer?.aiCallsToday ?? 0,
      resetAt: customer?.aiCallsResetAt ?? new Date(),
      dailyLimit: customer?.aiDailyLimit ?? 10,
    });

    if (!customerDecision.allowed) {
      console.warn(`Customer ${phoneNumber} hit their daily AI call limit.`);
      return false;
    }

    // Both checks passed - consume one unit from each.
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        aiCallsToday: restaurantDecision.newCallsToday,
        ...(restaurantDecision.needsReset ? { aiCallsResetAt: new Date() } : {}),
      },
    });

    await prisma.customer.upsert({
      where: { phoneNumber },
      update: {
        aiCallsToday: customerDecision.newCallsToday,
        ...(customerDecision.needsReset ? { aiCallsResetAt: new Date() } : {}),
      },
      create: { phoneNumber, aiCallsToday: 1 },
    });

    return true;
  } catch (err) {
    console.error("AI quota check failed, denying AI use for this message:", err.message);
    return false;
  }
}
