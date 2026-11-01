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

function signupOptions(): string[] {
  return PLANS.map((plan) => `${plan}: $${monthlyPriceCents(plan) / 100}/month`);
}

// Rename or remove a plan in `PLANS`, and TypeScript flags every place that still uses the
// old name, like "starter" here. While `Plan` was `string`, any text was accepted.
const DEFAULT_PLAN: Plan = "free";

test("prices", () => {
  assert.equal(monthlyPriceCents("free"), 0);
  assert.equal(monthlyPriceCents("pro"), 1200);
  assert.equal(monthlyPriceCents("team"), 4900);
});

test("the signup form lists every plan, in order", () => {
  assert.deepEqual(signupOptions(), ["free: $0/month", "pro: $12/month", "team: $49/month"]);
});

test("new accounts start on the free plan", () => {
  assert.equal(monthlyPriceCents(DEFAULT_PLAN), 0);
});

type _tests = [
  Expect<Equal<Plan, "free" | "pro" | "team">>,
  Expect<Equal<typeof PLANS, readonly ["free", "pro", "team"]>>,
];
