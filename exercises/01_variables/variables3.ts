// Sometimes a variable only gets its value later, in the branches of an `if`. Declare it
// without a value, and annotate its type, since there's no value to infer it from:
// `let fee: number;`.
//
// TypeScript then follows every path through the code, and won't let you read the variable
// on a path where nothing assigned it. That's why this beats a placeholder like
// `let fee = 0`: forget a case, and TypeScript tells you, instead of silently charging 0.
//
// TODO: Fix `deliveryFeeCents`. Orders that are neither express nor big enough for free
// delivery pay the standard fee.

import { test } from "node:test";
import assert from "node:assert/strict";

const STANDARD_FEE_CENTS = 499;
const EXPRESS_FEE_CENTS = 1299;
const FREE_DELIVERY_FROM_CENTS = 5000;

function deliveryFeeCents(subtotalCents: number, express: boolean): number {
  let fee: number;
  if (express) {
    fee = EXPRESS_FEE_CENTS;
  } else if (subtotalCents >= FREE_DELIVERY_FROM_CENTS) {
    fee = 0;
  }
  return fee;
}

// Don't change the tests below.

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
