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

// One line per plan on the signup form.
function signupOptions(): string[] {
  return PLANS.map((plan) => `${plan}: $${monthlyPriceCents(plan) / 100}/month`);
}

// Accounts created without picking a plan start on this one.
const DEFAULT_PLAN: Plan = "starter";

// Don't change the tests below.

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
