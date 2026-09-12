import test from "node:test";
import assert from "node:assert/strict";
import { computeIsAtRisk } from "../atRisk.js";

// computeIsAtRisk is deliberately pure (takes `now` as a parameter) so it can
// be tested without touching the database or mocking time globally.

test("not at risk when well within the estimated wait", () => {
  const now = new Date("2026-01-01T12:20:00Z");
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"), // waited 20 min
    estimatedWaitMinutes: 30,
    status: "WAITING",
  };
  assert.equal(computeIsAtRisk(entry, now), false);
});

test("not at risk exactly at the estimate", () => {
  const now = new Date("2026-01-01T12:30:00Z");
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"), // waited exactly 30 min
    estimatedWaitMinutes: 30,
    status: "WAITING",
  };
  assert.equal(computeIsAtRisk(entry, now), false);
});

test("at risk once waited time passes 1.3x the estimate", () => {
  const now = new Date("2026-01-01T12:40:00Z");
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"), // waited 40 min, threshold is 39
    estimatedWaitMinutes: 30,
    status: "WAITING",
  };
  assert.equal(computeIsAtRisk(entry, now), true);
});

test("not at risk if already seated, regardless of wait time", () => {
  const now = new Date("2026-01-01T13:00:00Z");
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"), // waited 60 min
    estimatedWaitMinutes: 10,
    status: "SEATED",
  };
  assert.equal(computeIsAtRisk(entry, now), false);
});

test("not at risk if cancelled", () => {
  const now = new Date("2026-01-01T13:00:00Z");
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"),
    estimatedWaitMinutes: 5,
    status: "CANCELLED",
  };
  assert.equal(computeIsAtRisk(entry, now), false);
});

test("handles a zero-minute estimate without crashing", () => {
  const now = new Date("2026-01-01T12:00:30Z"); // 30 seconds later
  const entry = {
    joinedAt: new Date("2026-01-01T12:00:00Z"),
    estimatedWaitMinutes: 0,
    status: "WAITING",
  };
  // threshold is 0 * 1.3 = 0, so any wait time flags it - this test
  // documents that current behavior rather than assuming it.
  assert.equal(computeIsAtRisk(entry, now), true);
});
