/**
 * A party is "at risk" of walking away if they've already waited noticeably
 * longer than we told them to expect. Staff dashboard highlights these so
 * someone can proactively step in (comp a drink, check in, prioritize them)
 * before the customer gives up and leaves.
 *
 * Deliberately pure and dependency-free (takes `now` as a parameter instead
 * of reading the clock itself) so it can be unit tested without spinning up
 * a database connection.
 */
export function computeIsAtRisk(entry, now = new Date()) {
  const waitedMinutes = (now.getTime() - entry.joinedAt.getTime()) / 60000;
  const threshold = entry.estimatedWaitMinutes * 1.3;
  return waitedMinutes > threshold && entry.status === "WAITING";
}
