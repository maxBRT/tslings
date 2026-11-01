import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// The parameter name in a function type is only documentation: any function that takes
// a number and returns a number fits.
type PriceRule = (priceCents: number) => number;

// A rest parameter collects the remaining arguments in an array, so its type is an array.
function applyRules(priceCents: number, ...rules: PriceRule[]) {
  let price = priceCents;
  for (const rule of rules) {
    price = rule(price);
  }
  return Math.round(price);
}

// Annotating the variable with the function type is enough: `price` is a `number` by
// contextual typing, and TypeScript checks that the arrow function returns a number.
const tenPercentOff: PriceRule = (price) => price * 0.9;
const fiveEurosOff: PriceRule = (price) => Math.max(0, price - 500);

test("no rules, no change", () => {
  assert.equal(applyRules(1999), 1999);
});

test("rules apply in order", () => {
  assert.equal(applyRules(10_000, tenPercentOff, fiveEurosOff), 8500);
  assert.equal(applyRules(10_000, fiveEurosOff, tenPercentOff), 8550);
});

test("inline rules get their types from the context", () => {
  assert.equal(
    applyRules(1000, (price) => price * 2, (price) => price + 1),
    2001,
  );
});

type _tests = [
  Expect<Equal<PriceRule, (priceCents: number) => number>>,
  Expect<Equal<Parameters<typeof applyRules>, [priceCents: number, ...rules: PriceRule[]]>>,
  Expect<Equal<ReturnType<typeof applyRules>, number>>,
];
