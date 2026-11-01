import { test } from "node:test";
import assert from "node:assert/strict";

function cartTotalCents(itemPricesCents: number[], couponCents: number): number {
  // Never reassigned: `const`.
  const shippingCents = 499;
  // Updated on every iteration: `let`.
  let total = shippingCents - couponCents;
  // `const` works in a `for...of` loop: each iteration gets a fresh `price` binding.
  for (const price of itemPricesCents) {
    total += price;
  }
  return total;
}

test("adds shipping to the items", () => {
  assert.equal(cartTotalCents([1000, 250], 0), 1749);
});

test("subtracts the coupon", () => {
  assert.equal(cartTotalCents([2000, 1500], 500), 3499);
});

test("an empty cart only pays shipping", () => {
  assert.equal(cartTotalCents([], 0), 499);
});
