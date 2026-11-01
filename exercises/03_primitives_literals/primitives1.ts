// Converting between text and numbers is where JavaScript hides its surprises. The types
// tell you which side you're on:
//
// - `Number(text)` returns a `number`, even when the text isn't one: `Number("12,50")` is
//   `NaN` ("not a number"), and `NaN` is a `number` too. The type can't tell you that
//   parsing failed, so you have to check, with `Number.isNaN(value)`.
// - `price.toFixed(2)` rounds a number for display and returns a `string`, like "12.50".
//   A template string such as `${price}` doesn't round: 12.5 stays "12.5".
//
// TODO: Fix `parsePriceCents` and `formatPrice` so the tests pass.

import { test } from "node:test";
import assert from "node:assert/strict";

// Reads a price typed into a form, in euros ("12.50"), and returns it in cents.
function parsePriceCents(input: string): number {
  const euros = Number(input);
  if (euros === NaN) {
    throw new RangeError(`Not a price: "${input}"`);
  }
  return Math.round(euros * 100);
}

// Formats a price in cents for display, always with two decimals: "12.50".
function formatPrice(cents: number): string {
  return cents / 100;
}

// Don't change the tests below.

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
