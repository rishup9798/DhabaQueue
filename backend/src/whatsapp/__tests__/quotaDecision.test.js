import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQuota } from "../quotaDecision.js";

test("allows a call when well under the daily limit", () => {
  const result = evaluateQuota(
    { callsToday: 3, resetAt: new Date("2026-01-01T00:00:00Z"), dailyLimit: 10 },
    new Date("2026-01-01T10:00:00Z")
  );
  assert.equal(result.allowed, true);
  assert.equal(result.newCallsToday, 4);
});

test("denies a call once at the daily limit", () => {
  const result = evaluateQuota(
    { callsToday: 10, resetAt: new Date("2026-01-01T00:00:00Z"), dailyLimit: 10 },
    new Date("2026-01-01T10:00:00Z")
  );
  assert.equal(result.allowed, false);
  assert.equal(result.newCallsToday, 10); // unchanged - call was denied
});

test("denies a call just above the daily limit", () => {
  const result = evaluateQuota(
    { callsToday: 15, resetAt: new Date("2026-01-01T00:00:00Z"), dailyLimit: 10 },
    new Date("2026-01-01T10:00:00Z")
  );
  assert.equal(result.allowed, false);
});

test("resets the counter once a new UTC day has started", () => {
  const result = evaluateQuota(
    { callsToday: 10, resetAt: new Date("2026-01-01T23:00:00Z"), dailyLimit: 10 },
    new Date("2026-01-02T01:00:00Z") // next day, even though <24h has passed
  );
  assert.equal(result.needsReset, true);
  assert.equal(result.allowed, true);
  assert.equal(result.newCallsToday, 1); // reset to 0, then this call consumes 1
});

test("does not reset when still within the same UTC day", () => {
  const result = evaluateQuota(
    { callsToday: 2, resetAt: new Date("2026-01-01T01:00:00Z"), dailyLimit: 10 },
    new Date("2026-01-01T23:00:00Z")
  );
  assert.equal(result.needsReset, false);
  assert.equal(result.newCallsToday, 3);
});

test("a fresh customer with zero calls is always allowed", () => {
  const result = evaluateQuota(
    { callsToday: 0, resetAt: new Date(), dailyLimit: 10 },
    new Date()
  );
  assert.equal(result.allowed, true);
});

test("a dailyLimit of zero denies every call", () => {
  const result = evaluateQuota(
    { callsToday: 0, resetAt: new Date("2026-01-01T00:00:00Z"), dailyLimit: 0 },
    new Date("2026-01-01T00:00:01Z")
  );
  assert.equal(result.allowed, false);
});
