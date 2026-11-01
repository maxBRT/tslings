// Functions are values, so they have types too. A function type looks like an arrow
// function with types instead of code: `(name: string) => boolean`. Give it a name with a
// type alias, `type Check = (name: string) => boolean;`, and use it like any other type.
//
// When TypeScript knows which function type is expected, it types the parameters of the
// arrow function you write there for you. That's contextual typing: it's why callbacks
// rarely need annotations, like the arrow functions passed to `applyRules` in the tests.
//
// TODO: Define `PriceRule`: a function that takes a price in cents and returns the new
// price in cents. Then use it to type the rest parameter `rules` (an array of rules).

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type PriceRule = unknown;

function applyRules(priceCents: number, ...rules) {
  let price = priceCents;
  for (const rule of rules) {
    price = rule(price);
  }
  return Math.round(price);
}

const tenPercentOff: PriceRule = (price) => price * 0.9;
const fiveEurosOff: PriceRule = (price) => Math.max(0, price - 500);

// Don't change the tests below.

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
