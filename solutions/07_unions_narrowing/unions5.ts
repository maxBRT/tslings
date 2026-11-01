// Assignments narrow too. `let value = amount` gives `value` the declared type
// `number | string`, which is everything it may ever hold. After `value = 12`,
// TypeScript knows it holds a number, until the next assignment. Where an `if`
// ends, TypeScript merges what each path left in the variable.
//
// That's how you normalize an input at the top of a function. Convert the
// awkward case once, then write the rest of the function for a single type.
//
// The checkout form sends amounts as strings ("1,299.99"), the API as numbers
// (1299.99). Make `toCents` convert both to a whole number of cents.

import { test } from "node:test";
import assert from "node:assert/strict";

function toCents(amount: number | string): number {
  let value = amount;
  if (typeof value === "string") {
    value = Number(value.replaceAll(",", ""));
  }
  // Inside the `if`, `value` became a number; the other path only had numbers.
  // So from here on, `value` is a `number`.
  //
  // A ternary does the same job without `let`:
  //   const value = typeof amount === "string" ? Number(amount.replaceAll(",", "")) : amount;

  if (!Number.isFinite(value)) {
    throw new RangeError(`Not an amount: ${amount}`);
  }
  return Math.round(value * 100);
}

// Don't change the tests below.

test("numbers from the API", () => {
  assert.equal(toCents(12.5), 1250);
  assert.equal(toCents(0.1 + 0.2), 30);
});

test("strings from the form", () => {
  assert.equal(toCents("19.99"), 1999);
  assert.equal(toCents("1,299.99"), 129999);
});

test("garbage is rejected", () => {
  assert.throws(() => toCents("twelve"), RangeError);
  assert.throws(() => toCents(Number.NaN), RangeError);
});
