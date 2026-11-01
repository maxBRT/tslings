import { test } from "node:test";
import assert from "node:assert/strict";

const STANDARD_FEE_CENTS = 499;
const EXPRESS_FEE_CENTS = 1299;
const FREE_DELIVERY_FROM_CENTS = 5000;

// In a function this short, early returns (`if (express) return EXPRESS_FEE_CENTS;` ...)
// would be just as good. The `let fee: number;` pattern shines when each branch does more
// work before the value is known.
function deliveryFeeCents(subtotalCents: number, express: boolean): number {
  // No initializer: TypeScript checks that every path below assigns `fee`.
  let fee: number;
  if (express) {
    fee = EXPRESS_FEE_CENTS;
  } else if (subtotalCents >= FREE_DELIVERY_FROM_CENTS) {
    fee = 0;
  } else {
    fee = STANDARD_FEE_CENTS;
  }
  return fee;
}

test("express delivery always costs the express fee", () => {
  assert.equal(deliveryFeeCents(1000, true), 1299);
  assert.equal(deliveryFeeCents(8000, true), 1299);
});

test("big orders are delivered for free", () => {
  assert.equal(deliveryFeeCents(5000, false), 0);
});

test("small orders pay the standard fee", () => {
  assert.equal(deliveryFeeCents(4999, false), 499);
});
