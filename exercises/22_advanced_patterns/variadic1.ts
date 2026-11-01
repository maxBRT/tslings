// A *variadic tuple type* spreads tuple types into another tuple: `[...Head, ...Tail]`. When a
// function's parameters are typed that way, TypeScript can infer each part separately. That's
// how you type helpers that split or join argument lists without losing a single parameter type.
//
// A common case is binding the first arguments of a function, like `fn.bind(null, a, b)`, to get
// back a function that takes the rest. `bindFirst` below works at runtime, but its type throws
// away everything TypeScript knew about `fn`'s parameters.
//
// TODO: Type `fn` so that its parameters are `Bound` followed by `Rest`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function bindFirst<Bound extends unknown[], Rest extends unknown[], Result>(
  fn: (...args: unknown[]) => Result,
  ...bound: Bound
): (...rest: Rest) => Result {
  return (...rest) => fn(...bound, ...rest);
}

function formatPrice(currency: string, locale: string, cents: number): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

type Level = "info" | "warn" | "error";

function logLine(level: Level, scope: string, message: string, at: Date): string {
  return `${at.toISOString()} [${level}] ${scope}: ${message}`;
}

const formatDollars = bindFirst(formatPrice, "USD", "en-US");
const warnBilling = bindFirst(logLine, "warn", "billing");

// Don't change the tests below.

test("bound arguments come first", () => {
  assert.equal(formatDollars(1999), "$19.99");
  const at = new Date("2026-11-01T09:30:00Z");
  assert.equal(
    warnBilling("card expires soon", at),
    "2026-11-01T09:30:00.000Z [warn] billing: card expires soon",
  );
});

// Binding every argument leaves a function that takes none.
const freeShipping = bindFirst(formatPrice, "EUR", "en-US", 0);

test("binding every argument", () => {
  assert.equal(freeShipping(), "€0.00");
});

type _tests = [
  Expect<Equal<typeof formatDollars, (cents: number) => string>>,
  Expect<Equal<typeof warnBilling, (message: string, at: Date) => string>>,
  Expect<Equal<typeof freeShipping, () => string>>,
];
