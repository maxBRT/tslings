// `throw` is invisible in a function's type: nothing in `(input: string) => number` warns the
// caller that it can fail, or how. For failures that are expected, like a user typing "12,50"
// in a form, many TypeScript codebases return a `Result` instead: a discriminated union that
// is either a value or an error. The failure cases are now part of the signature, and the
// caller can't read the value without checking `ok` first.
//
// Rule of thumb: return a `Result` when the caller is expected to handle the failure (invalid
// input, item not found). Throw when something is broken (a bug, a missing config) and the
// best thing to do is stop.
//
// Make `parseAmount` return its failures instead of throwing them, then finish
// `amountFeedback`, which shows a message under the "amount" field of a transfer form.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Given: a reusable Result type. `T` is the type of the value on success, `E` the type of the
// error. The generics chapter shows how to write types like this one.
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Error codes, not messages: the UI decides how to word them.
type AmountError = "empty" | "not_a_number" | "too_many_decimals" | "not_positive";

// Parses what the user typed ("12.50") into cents (1250).
function parseAmount(input: string): Result<number, AmountError> {
  const trimmed = input.trim();
  // The return type checks every literal: `{ ok: false, error: "emtpy" }` wouldn't compile.
  if (trimmed === "") {
    return { ok: false, error: "empty" };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, error: "not_a_number" };
  }
  if (/\.\d{3,}$/.test(trimmed)) {
    return { ok: false, error: "too_many_decimals" };
  }
  const cents = Math.round(Number(trimmed) * 100);
  if (cents === 0) {
    return { ok: false, error: "not_positive" };
  }
  return { ok: true, value: cents };
}

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function amountFeedback(input: string): string {
  const result = parseAmount(input);
  if (result.ok) {
    return `You are sending ${formatEuros(result.value)}.`;
  }
  // `result.error` is an `AmountError` here. The `switch` is exhaustive, so TypeScript doesn't
  // ask for a final `return`; a fifth error code would make it point at this function.
  switch (result.error) {
    case "empty":
      return "Enter an amount.";
    case "not_a_number":
      return "Use digits and a dot, like 12.50.";
    case "too_many_decimals":
      return "Use at most 2 decimals.";
    case "not_positive":
      return "The amount must be more than zero.";
  }
}

// Don't change the tests below.

test("parses valid amounts into cents", () => {
  assert.deepEqual(parseAmount("12.50"), { ok: true, value: 1250 });
  assert.deepEqual(parseAmount(" 7 "), { ok: true, value: 700 });
  assert.deepEqual(parseAmount("0.29"), { ok: true, value: 29 });
});

test("returns failures as values", () => {
  assert.deepEqual(parseAmount("  "), { ok: false, error: "empty" });
  assert.deepEqual(parseAmount("12,50"), { ok: false, error: "not_a_number" });
  assert.deepEqual(parseAmount("-5"), { ok: false, error: "not_a_number" });
  assert.deepEqual(parseAmount("9.999"), { ok: false, error: "too_many_decimals" });
  assert.deepEqual(parseAmount("0.00"), { ok: false, error: "not_positive" });
});

test("shows feedback under the field", () => {
  assert.equal(amountFeedback("12.5"), "You are sending €12.50.");
  assert.equal(amountFeedback(""), "Enter an amount.");
  assert.equal(amountFeedback("12€"), "Use digits and a dot, like 12.50.");
  assert.equal(amountFeedback("1.005"), "Use at most 2 decimals.");
  assert.equal(amountFeedback("0"), "The amount must be more than zero.");
});

type _tests = [Expect<Equal<ReturnType<typeof parseAmount>, Result<number, AmountError>>>];
