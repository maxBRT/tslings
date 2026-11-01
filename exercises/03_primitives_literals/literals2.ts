// Array elements widen like a `let` does: `["free", "pro"]` is a `string[]`, because code
// could push any string into it later. Write `as const` after the value, and TypeScript
// treats it as fixed: the array becomes a `readonly` tuple of literal types,
// `readonly ["free", "pro"]`. Despite the `as`, this isn't a cast, and tslings allows it:
// it doesn't switch off any check, it only asks for the most precise type.
//
// That lets one array be both data, for the code that runs, and the source of a union
// type, for the type checker: `(typeof PLANS)[number]` means "the type of any element of
// PLANS". You'll learn `typeof` and `[number]` in detail later.
//
// TODO: Make `Plan` the union of the three plan names, without writing them a second time.
// Then fix what TypeScript finds.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Shown in this order on the signup form.
const PLANS = ["free", "pro", "team"];
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

// The pricing page lists the plans from the most expensive to the cheapest. The prices
// are passed in, because a promotion can change them.
function pricingPageOrder(priceCents: (plan: Plan) => number): Plan[] {
  return PLANS.sort((a, b) => priceCents(b) - priceCents(a));
}

// Don't change the tests below.

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
