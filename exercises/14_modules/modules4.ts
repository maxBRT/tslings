// A package often has one entry file (an "index" or "barrel") that re-exports what its users
// need from the internal modules:
//
//   export { add, money } from "./money.ts";            // by name
//   export { format as formatMoney } from "./money.ts"; // renamed on the way out
//   export type { Money } from "./money.ts";            // types need `export type`
//   export * from "./money.ts";                         // everything money.ts exports
//
// `export *` looks convenient, but it publishes every export, including helpers that a module
// only exports for its siblings, and it breaks when two modules export the same name.
// Barrels have a cost too: importing one name loads every module behind it. Inside an app,
// import from the module itself; keep barrels for the public API of a package.
//
// This file is the entry point of a small billing package. The tests import it the way a
// user of the package would.
//
// TODO: Replace the `export *` lines so that this file exports exactly:
// - from money.ts: `money`, `add`, `multiply`, its `format` as `formatMoney`, and the types
//   `Money` and `Currency`;
// - from dates.ts: `addDays`, and its `format` as `formatDate`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";
import * as billing from "./modules4.ts";

export * from "./money.ts";
export * from "./dates.ts";

// Don't change the tests below.

test("prices", () => {
  const unit: billing.Money = billing.money(1_999, "EUR");
  const total = billing.add(billing.multiply(unit, 2), billing.money(2, "EUR"));
  assert.equal(billing.formatMoney(total), "€40.00");
});

test("due dates", () => {
  const due = billing.addDays(new Date("2026-11-01T00:00:00Z"), 30);
  assert.equal(billing.formatDate(due), "2026-12-01");
});

test("only the public API is exported", () => {
  assert.deepEqual(Object.keys(billing), [
    "add",
    "addDays",
    "formatDate",
    "formatMoney",
    "money",
    "multiply",
  ]);
});

const currencies: billing.Currency[] = ["EUR", "USD", "GBP"];

type _tests = [
  Expect<Equal<(typeof currencies)[number], "EUR" | "USD" | "GBP">>,
  Expect<
    Equal<
      keyof typeof billing,
      "money" | "add" | "multiply" | "formatMoney" | "addDays" | "formatDate"
    >
  >,
];
