import { prisma } from "../lib/prisma.js";
import { sendWhatsAppMessage } from "../whatsapp/sendMessage.js";
import { computeIsAtRisk } from "./atRisk.js";

// Re-exported so existing imports of `computeIsAtRisk` from estimator.js
// (e.g. routes.js) keep working without changes.
export { computeIsAtRisk };

/**
 * Estimates how many minutes a new party will wait, based on:
 *  - how many parties are ahead of them that need a table of similar size
 *  - a rolling average of how long recent tables actually took to turn over
 *    (falls back to the restaurant's configured default if there's no
 *    history yet)
 *
 * This is intentionally simple (no ML) but it's real logic, not a fixed
 * number — it adapts as the restaurant's actual turnover data comes in.
 */
export async function estimateWaitMinutes(restaurantId, partySize) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  const avgTurnover = await getRollingAverageTurnover(restaurantId, restaurant.avgTurnoverMinutes);

  // A table only "fits" a party if its capacity is enough but not
  // wastefully oversized (within a small buffer) — a party of 2 shouldn't
  // be scored against a table for 10.
  const suitableFreeTables = await prisma.table.count({
    where: {
      restaurantId,
      status: "FREE",
      capacity: { gte: partySize, lte: partySize + 2 },
    },
  });

  // A suitable table is free right now — no real wait, just needs seating.
  if (suitableFreeTables > 0) {
    return 0;
  }

  // Otherwise, count parties ahead that need a table roughly the same size
  // or bigger — a party of 2 isn't blocked by a party of 8 waiting for a
  // big table.
  const partiesAhead = await prisma.queueEntry.count({
    where: {
      restaurantId,
      status: "WAITING",
      partySize: { gte: Math.max(1, partySize - 1) },
    },
  });

  const estimate = Math.round((partiesAhead + 1) * avgTurnover);
  return Math.max(estimate, 5);
}

async function getRollingAverageTurnover(restaurantId, fallbackMinutes) {
  const recentSeated = await prisma.queueEntry.findMany({
    where: { restaurantId, status: "SEATED", seatedAt: { not: null } },
    orderBy: { seatedAt: "desc" },
    take: 15,
  });

  if (recentSeated.length < 3) {
    // Not enough history yet - use the restaurant's configured default.
    return fallbackMinutes;
  }

  const totalMinutes = recentSeated.reduce((sum, entry) => {
    const waitedMs = entry.seatedAt.getTime() - entry.joinedAt.getTime();
    return sum + waitedMs / 60000;
  }, 0);

  return totalMinutes / recentSeated.length;
}

/**
 * Recomputes isAtRisk for every currently-waiting entry. Meant to be run on
 * an interval (see server.js) so the dashboard stays accurate even if no one
 * has taken an action recently.
 */
export async function refreshAtRiskFlags(restaurantId) {
  const waitingEntries = await prisma.queueEntry.findMany({
    where: { restaurantId, status: "WAITING" },
  });

  const newlyChanged = waitingEntries
    .map((entry) => ({ entry, isAtRisk: computeIsAtRisk(entry) }))
    .filter(({ entry, isAtRisk }) => isAtRisk !== entry.isAtRisk);

  for (const { entry, isAtRisk } of newlyChanged) {
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { isAtRisk },
    });

    // Only message the customer when a party *newly* crosses into at-risk,
    // not on every refresh - avoids spamming them every 60s.
    if (isAtRisk) {
      try {
        await sendWhatsAppMessage(
          entry.customerPhoneNumber,
          "Thanks for your patience — your table is taking a bit longer than expected. We haven't forgotten you, and it shouldn't be much longer!"
        );
      } catch (err) {
        console.error(`Failed to send at-risk notice to ${entry.customerPhoneNumber}:`, err.message);
      }
    }
  }

  return newlyChanged.length > 0;
}
