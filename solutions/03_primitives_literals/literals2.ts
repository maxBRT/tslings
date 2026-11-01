import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// One source of truth: add a plan to the array, and `Plan` gets it too.
const PLANS = ["free", "pro", "team"] as const;
type Plan = (typeof PLANS)[number];

function monthlyPriceCents(plan: Plan): number {
  if (plan === "free") {
    return 0;
  }
  if (plan === "pro") {
    return 1200;
  }
  return 4900;
}

function pricingPageOrder(priceCents: (plan: Plan) => number): Plan[] {
  // `sort` reorders the array in place, so it would have changed the signup form's order
  // too. A readonly array has no `sort`; `toSorted` (ES2023) returns a sorted copy.
  // `[...PLANS].sort(...)` works as well.
  return PLANS.toSorted((a, b) => priceCents(b) - priceCents(a));
}

test("prices", () => {
  assert.equal(monthlyPriceCents("free"), 0);
  assert.equal(monthlyPriceCents("team"), 4900);
});

test("the pricing page starts with the most expensive plan", () => {
  assert.deepEqual(pricingPageOrder(monthlyPriceCents), ["team", "pro", "free"]);
});

test("a promotion can change the order", () => {
  const teamPromo = (plan: Plan) => (plan === "team" ? 900 : monthlyPriceCents(plan));
  assert.deepEqual(pricingPageOrder(teamPromo), ["pro", "team", "free"]);
});

test("the signup form keeps its order", () => {
  pricingPageOrder(monthlyPriceCents);
  assert.deepEqual(PLANS, ["free", "pro", "team"]);
});

type _tests = [
  Expect<Equal<Plan, "free" | "pro" | "team">>,
  Expect<Equal<typeof PLANS, readonly ["free", "pro", "team"]>>,
];
