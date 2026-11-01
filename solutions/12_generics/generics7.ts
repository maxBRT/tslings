// A type parameter earns its place by connecting things: a parameter to the
// return type, or two parameters to each other. Used only once, it connects
// nothing and makes the signature harder to read. Rule of thumb from the
// TypeScript handbook: a type parameter should appear at least twice.
//
// Worse, a type parameter that appears ONLY in the return type is a promise
// the function can't keep: the CALLER picks `T`, and the function can't build
// a value of a type it doesn't know. TypeScript rejects one below.
//
// Remove the type parameters that connect nothing. One of the three functions
// uses its type parameter well: keep that one.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface Order {
  id: string;
  totalCents: number;
  currency: "EUR" | "USD";
}

// `T` appeared once, so it connected nothing. Any `Order` (or any object with
// at least these fields) is accepted either way.
function formatTotal(order: Order): string {
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency });
  return format.format(order.totalCents / 100);
}

// A caller could have written `emptyOrder<Order & { giftWrap: true }>()` and
// received an object without `giftWrap`. Returning `Order` is the honest type.
// The same smell hides in `function parse<T>(json: string): T`: it's a type
// assertion in disguise, and `unknown` plus a type guard is the honest version.
function emptyOrder(): Order {
  return { id: "draft", totalCents: 0, currency: "EUR" };
}

// Returns the first tag, keeping its exact literal type.
// `T` appears in the parameter AND in the return type, so it carries the
// caller's literal tags through: `string | undefined` would lose them.
function firstTag<T extends string>(tags: readonly T[]): T | undefined {
  return tags[0];
}

// Don't change the tests below.

test("formats an order total", () => {
  assert.equal(formatTotal({ id: "o1", totalCents: 1999, currency: "USD" }), "$19.99");
  assert.equal(formatTotal({ id: "o2", totalCents: 500, currency: "EUR" }), "€5.00");
});

test("creates an empty draft order", () => {
  assert.deepEqual(emptyOrder(), { id: "draft", totalCents: 0, currency: "EUR" });
});

test("keeps the exact tag type", () => {
  const tag = firstTag(["new", "sale"]);
  type _test = Expect<Equal<typeof tag, "new" | "sale" | undefined>>;
  assert.equal(tag, "new");
});

// Type tests: each line only compiles when the two types are exactly the same.
// A generic function type, `<T extends Order>(order: T) => string`, is not the
// same type as `(order: Order) => string`.
type _tests = [
  Expect<Equal<typeof formatTotal, (order: Order) => string>>,
  Expect<Equal<typeof emptyOrder, () => Order>>,
];
