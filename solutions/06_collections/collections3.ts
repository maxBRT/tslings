// Record or Map?
// - Keys known in advance (a union like `Plan`): a `Record<Plan, V>` object.
//   TypeScript checks that every key is there, and reading one is always safe.
// - Keys that come from data (user ids, words, URLs): a `Map<K, V>`.
//
// `Object.keys` and `Object.entries` type their keys as `string`, even for a
// `Record<Plan, number>`. That's structural typing again: a value of that type
// may have more properties at runtime than its type lists, so TypeScript can't
// promise every key is a `Plan`. Don't loop over `Object.keys` to index back
// into the object; `Object.entries` gives you each key with its value.
//
// The plans of a SaaS product are known in advance. Fix both TODOs.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Plan = "free" | "pro" | "team";

// Leaving out a plan is now a compile error, and `MONTHLY_PRICE[plan]` is a
// plain `number`.
const MONTHLY_PRICE: Record<Plan, number> = {
  free: 0,
  pro: 12,
  team: 30,
};

function priceOf(plan: Plan): number {
  return MONTHLY_PRICE[plan];
}

function priceList(prices: Record<Plan, number>): string[] {
  // `plan` is a `string` here, which is fine: it's only displayed. When you do
  // need `Plan` keys, loop over a list of plans you wrote yourself instead.
  return Object.entries(prices).map(([plan, price]) => `${plan}: $${price}/month`);
}

// Don't change the tests below.

test("price of a plan", () => {
  assert.equal(priceOf("free"), 0);
  assert.equal(priceOf("pro"), 12);
  assert.equal(priceOf("team"), 30);
});

test("price list", () => {
  assert.deepEqual(priceList(MONTHLY_PRICE), [
    "free: $0/month",
    "pro: $12/month",
    "team: $30/month",
  ]);
  assert.deepEqual(priceList({ free: 0, pro: 15, team: 45 }), [
    "free: $0/month",
    "pro: $15/month",
    "team: $45/month",
  ]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<typeof MONTHLY_PRICE, Record<Plan, number>>>,
  Expect<Equal<Plan, "free" | "pro" | "team">>,
  // `priceList` keeps its `Record<Plan, number>` parameter.
  Expect<Equal<Parameters<typeof priceList>[0], Record<Plan, number>>>,
];
