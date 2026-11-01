// `const` declares a variable that can't be reassigned; `let` declares one that can.
// TypeScript developers write `const` by default and use `let` only for the few values
// that really change, like a running total. A reader then knows at a glance which
// values move, and TypeScript refuses any code that reassigns a `const`.
//
// TODO: `cartTotalCents` doesn't compile. Read the error, then fix the declaration of the
// variable it names. A warning also points at a second declaration: fix that one too.

import { test } from "node:test";
import assert from "node:assert/strict";

// Prices are in cents: integers add up exactly, unlike 0.1 + 0.2.
function cartTotalCents(itemPricesCents: number[], couponCents: number): number {
  let shippingCents = 499;
  const total = shippingCents - couponCents;
  for (const price of itemPricesCents) {
    total = total + price;
  }
  return total;
}

// Don't change the tests below.

test("adds shipping to the items", () => {
  assert.equal(cartTotalCents([1000, 250], 0), 1749);
});

test("subtracts the coupon", () => {
  assert.equal(cartTotalCents([2000, 1500], 500), 3499);
});

test("an empty cart only pays shipping", () => {
  assert.equal(cartTotalCents([], 0), 499);
});
