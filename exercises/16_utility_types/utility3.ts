// Libraries often export functions without exporting the types around them.
// Don't copy those types by hand: derive them from the function itself.
//   Parameters<F>   the tuple of F's parameter types
//   ReturnType<F>   F's return type
//   Awaited<T>      what a promise resolves to: `await`, at the type level
// `F` must be a type, so pass `typeof someFunction`.
//
// `payments_sdk.ts`, next to this file, plays the part of a library from npm.
// Derive `ChargeOptions` and `Charge` from its `createCharge` function.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";
import { createCharge } from "./payments_sdk.ts";

// TODO: The options object that `createCharge` takes (its second parameter).
type ChargeOptions = unknown;

// TODO: What `await createCharge(...)` gives you.
type Charge = unknown;

function chargeAll(amounts: readonly number[], options: ChargeOptions): Promise<Charge[]> {
  return Promise.all(amounts.map((amount) => createCharge(amount, options)));
}

function receiptLine(charge: Charge): string {
  return `${(charge.amountCents / 100).toFixed(2)} ${charge.currency} for ${charge.customerId}`;
}

function needsReview(charges: readonly Charge[]): Charge[] {
  return charges.filter((charge) => charge.status === "requires_review");
}

// Don't change the tests below.

test("charges every amount with the same options", async () => {
  const charges = await chargeAll([1250, 250_000], { currency: "EUR", customerId: "cus_42" });
  assert.deepEqual(charges.map(receiptLine), [
    "12.50 EUR for cus_42",
    "2500.00 EUR for cus_42",
  ]);
});

test("large charges need a review", async () => {
  const charges = await chargeAll([500, 150_000, 99_000], { currency: "USD", customerId: "cus_7" });
  assert.deepEqual(needsReview(charges).map((charge) => charge.amountCents), [150_000]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<
    Equal<ChargeOptions, { currency: "EUR" | "USD"; customerId: string; description?: string }>
  >,
  Expect<Equal<Charge["status"], "succeeded" | "requires_review">>,
  Expect<Equal<Charge["createdAt"], Date>>,
];
