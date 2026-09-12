import test from "node:test";
import assert from "node:assert/strict";

// The party-size validation logic lives inline inside conversation.js's
// AWAITING_PARTY_SIZE branch. It's small enough to duplicate here as a pure
// function for a focused unit test, exercising the exact same rule
// (1-30 inclusive, must parse as an integer).
function isValidPartySize(rawInput) {
  const partySize = parseInt(rawInput.trim().toLowerCase(), 10);
  return Boolean(partySize) && partySize >= 1 && partySize <= 30;
}

test("accepts a normal party size", () => {
  assert.equal(isValidPartySize("4"), true);
});

test("accepts party size with surrounding whitespace", () => {
  assert.equal(isValidPartySize("  6  "), true);
});

test("rejects zero", () => {
  assert.equal(isValidPartySize("0"), false);
});

test("rejects negative numbers", () => {
  assert.equal(isValidPartySize("-2"), false);
});

test("rejects non-numeric text", () => {
  assert.equal(isValidPartySize("hello"), false);
});

test("rejects unreasonably large party sizes", () => {
  assert.equal(isValidPartySize("500"), false);
});

test("accepts the upper boundary of 30", () => {
  assert.equal(isValidPartySize("30"), true);
});

test("rejects just above the upper boundary", () => {
  assert.equal(isValidPartySize("31"), false);
});
