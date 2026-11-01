// An indexed access type reads one type out of another, with the same
// brackets as JavaScript: `Subscription["plan"]` is the type of that property.
// Two forms come up all the time:
//   T[number]    the element type of an array or tuple type
//   T[keyof T]   the union of the types of all of T's properties
//
// With `as const`, an array or object keeps its literal values, so you can
// keep ONE list that exists at runtime and derive the union type from it.
//
// Derive the three types below. The last one will reveal a bug.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const PLANS = ["free", "pro", "team", "enterprise"] as const;

const STATUS_LABELS = {
  active: "Active",
  pastDue: "Payment overdue",
  canceled: "Canceled",
} as const;

// `typeof PLANS` is `readonly ["free", "pro", "team", "enterprise"]`, and
// indexing a tuple type with `number` gives the union of its elements.
// `typeof PLANS[number]` means the same; the parentheses only help the reader.
type Plan = (typeof PLANS)[number];

interface Subscription {
  plan: Plan;
  status: keyof typeof STATUS_LABELS;
  billing: { interval: "month" | "year"; amountCents: number };
}

// The union of all the values of the object. Without `as const` on
// STATUS_LABELS, this would only be `string`.
type StatusLabel = (typeof STATUS_LABELS)[keyof typeof STATUS_LABELS];

// Indexed access types chain like property accesses.
type BillingInterval = Subscription["billing"]["interval"];

function statusLabel(subscription: Subscription): StatusLabel {
  return STATUS_LABELS[subscription.status];
}

// With `interval: string`, the typo "monthly" compiled and every monthly plan
// was billed once a year. With the precise union, TypeScript reported that
// the comparison could never be true.
function chargesPerYear(interval: BillingInterval): number {
  return interval === "month" ? 12 : 1;
}

// Don't change the tests below.

test("labels the status", () => {
  const sub: Subscription = {
    plan: "enterprise",
    status: "pastDue",
    billing: { interval: "year", amountCents: 120_000 },
  };
  assert.equal(statusLabel(sub), "Payment overdue");
});

test("counts the charges per year", () => {
  assert.equal(chargesPerYear("month"), 12);
  assert.equal(chargesPerYear("year"), 1);
});

test("PLANS is still a real array at runtime", () => {
  assert.deepEqual(PLANS.toSorted(), ["enterprise", "free", "pro", "team"]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<Plan, "free" | "pro" | "team" | "enterprise">>,
  Expect<Equal<StatusLabel, "Active" | "Payment overdue" | "Canceled">>,
  Expect<Equal<BillingInterval, "month" | "year">>,
];
