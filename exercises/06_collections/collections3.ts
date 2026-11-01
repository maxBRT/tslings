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

// TODO: Use a Record instead, so that TypeScript can check that every plan
// has a price. The team plan costs 30.
const MONTHLY_PRICE = new Map<Plan, number>([
  ["free", 0],
  ["pro", 12],
]);

function priceOf(plan: Plan): number {
  return MONTHLY_PRICE.get(plan);
}

// TODO: One line per plan, like "pro: $12/month", without indexing `prices`
// with a `string`.
function priceList(prices: Record<Plan, number>): string[] {
  return Object.keys(prices).map((plan) => `${plan}: $${prices[plan]}/month`);
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
