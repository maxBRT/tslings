import { test } from "node:test";
import assert from "node:assert/strict";

function parsePriceCents(input: string): number {
  const euros = Number(input);
  // `NaN` is the only value that isn't equal to itself, so `euros === NaN` is always false.
  // TypeScript knows it and reports the comparison.
  if (Number.isNaN(euros)) {
    throw new RangeError(`Not a price: "${input}"`);
  }
  // Watch out: `Number("")` and `Number("  ")` are 0, not NaN. A real form would reject
  // empty input before parsing.
  return Math.round(euros * 100);
}

// `toFixed` is for display: it returns a string. To round a number and keep a number,
// use `Math.round` as `parsePriceCents` does.
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

test("parses prices", () => {
  assert.equal(parsePriceCents("12.50"), 1250);
  assert.equal(parsePriceCents("19.99"), 1999);
  assert.equal(parsePriceCents("7"), 700);
});

test("rejects text that isn't a number", () => {
  assert.throws(() => parsePriceCents("12,50"), RangeError);
  assert.throws(() => parsePriceCents("free"), RangeError);
});

test("formats prices with two decimals", () => {
  assert.equal(formatPrice(1250), "12.50");
  assert.equal(formatPrice(5), "0.05");
  assert.equal(formatPrice(120000), "1200.00");
});
