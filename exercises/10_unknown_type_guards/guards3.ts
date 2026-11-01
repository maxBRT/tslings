// "Parse, don't validate." A validator answers yes or no and leaves you with the raw `unknown`
// data. A parser checks the data AND turns it into a precise type: a `Payment` with a `Date`,
// an amount you know is a whole number of cents, a currency from a known list. Parse untrusted
// data once, at the edge of your program; everything after that works with the typed value
// and never checks it again.
//
// Our payment provider sends webhooks with JSON bodies like this one:
//   { "id": "pay_123", "amount": 1999, "currency": "eur", "created": "2026-10-31T12:00:00Z" }
//
// Write `parsePayment`. On success, return the parsed payment. When something is wrong, return
// an error that starts with the name of the field ("amount must be ...").

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const CURRENCIES = ["EUR", "USD", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

type Payment = {
  readonly id: string;
  /** A non-negative whole number of cents. */
  readonly amountCents: number;
  readonly currency: Currency;
  readonly createdAt: Date;
};

type ParseResult = { ok: true; payment: Payment } | { ok: false; error: string };

function parsePayment(body: unknown): ParseResult {
  // TODO: This trusts the webhook blindly. Check each field, and return
  // `{ ok: false, error: "..." }` for the first one that's wrong.
  return {
    ok: true,
    payment: {
      id: body.id,
      amountCents: body.amount,
      currency: body.currency.toUpperCase(),
      createdAt: new Date(body.created),
    },
  };
}

// Don't change the tests below.

const valid = { id: "pay_123", amount: 1999, currency: "eur", created: "2026-10-31T12:00:00Z" };

function errorOf(result: ParseResult): string {
  if (result.ok) assert.fail("expected the payment to be rejected");
  return result.error;
}

test("parses a valid payment", () => {
  assert.deepEqual(parsePayment(valid), {
    ok: true,
    payment: {
      id: "pay_123",
      amountCents: 1999,
      currency: "EUR",
      createdAt: new Date("2026-10-31T12:00:00Z"),
    },
  });
});

test("rejects bodies that are not objects", () => {
  for (const body of [null, "pay_123", 1999, []]) {
    assert.equal(parsePayment(body).ok, false);
  }
});

test("starts the error with the field that is wrong", () => {
  assert.match(errorOf(parsePayment({ ...valid, id: 123 })), /^id\b/);
  assert.match(errorOf(parsePayment({ ...valid, amount: "1999" })), /^amount\b/);
  assert.match(errorOf(parsePayment({ ...valid, amount: 19.99 })), /^amount\b/);
  assert.match(errorOf(parsePayment({ ...valid, amount: -500 })), /^amount\b/);
  assert.match(errorOf(parsePayment({ ...valid, currency: "jpy" })), /^currency\b/);
  assert.match(errorOf(parsePayment({ ...valid, currency: 978 })), /^currency\b/);
  assert.match(errorOf(parsePayment({ ...valid, created: "yesterday" })), /^created\b/);
  const { created: _, ...withoutCreated } = valid;
  assert.match(errorOf(parsePayment(withoutCreated)), /^created\b/);
});

type _tests = [
  Expect<Equal<Payment["currency"], "EUR" | "USD" | "GBP">>,
  Expect<Equal<Payment["createdAt"], Date>>,
];
