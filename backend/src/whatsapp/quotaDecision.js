/**
 * Pure decision: given current counters and the limit, should this call be
 * allowed, and does the "today" counter need resetting first?
 *
 * Kept dependency-free (no DB, no clock reads) so it can be unit tested
 * directly - the DB-touching wrapper (in aiQuota.js) is just plumbing
 * around this.
 */
export function evaluateQuota({ callsToday, resetAt, dailyLimit }, now = new Date()) {
  const isNewDay = now.getUTCDate() !== resetAt.getUTCDate() ||
    now.getUTCMonth() !== resetAt.getUTCMonth() ||
    now.getUTCFullYear() !== resetAt.getUTCFullYear();

  const effectiveCallsToday = isNewDay ? 0 : callsToday;
  const allowed = effectiveCallsToday < dailyLimit;

  return {
    allowed,
    needsReset: isNewDay,
    newCallsToday: allowed ? effectiveCallsToday + 1 : effectiveCallsToday,
  };
}
