// A last cleanup, the way a code review would go. Each lint here points at a real problem.
//
// `prefer-const` flags a `let` that is never reassigned. `const` tells the reader the value
// won't change, and TypeScript gives it a narrower type: `let shift = "day"` is a `string`,
// while `const shift = "day"` is the literal type `"day"`, which fits a `Shift` union.
//
// `no-non-null-assertion` flags `value!`, which tells TypeScript "this isn't undefined" without
// checking. When you're wrong, nothing fails at that line: a `NaN` or a crash shows up somewhere
// else, later. Handle the `undefined` case where it happens instead.

import { test } from "node:test";
import assert from "node:assert/strict";

type Shift = "day" | "evening" | "night";
type TimeEntry = { project: string; shift: Shift; hours: number };

// What each client pays per hour of work on their project.
const hourlyRates = new Map([
  ["website", 80],
  ["mobile-app", 95],
]);
// Evening and night hours are paid extra, per hour.
const shiftBonus: Record<Shift, number> = { day: 0, evening: 10, night: 25 };

function newEntry(project: string): TimeEntry {
  // `const` keeps the literal type `"day"`. (The shorter fix is to inline it: `shift: "day"`.)
  const shift = "day";
  return { project, shift, hours: 8 };
}

function entryAmount(entry: TimeEntry): number {
  const rate = hourlyRates.get(entry.project);
  // With `!`, an unknown project gave `undefined + 0`, so the invoice total became NaN.
  if (rate === undefined) throw new Error(`Unknown project: ${entry.project}`);
  return (rate + shiftBonus[entry.shift]) * entry.hours;
}

function invoiceTotal(entries: readonly TimeEntry[]): number {
  // `total` really is reassigned, so it stays `let`. `entry` isn't: `for (const ... of ...)`
  // gets a fresh binding each time around the loop.
  let total = 0;
  for (const entry of entries) total += entryAmount(entry);
  return total;
}

// Don't change the tests below.

test("a new entry is a full day shift", () => {
  assert.deepEqual(newEntry("website"), { project: "website", shift: "day", hours: 8 });
});

test("night hours are paid more", () => {
  assert.equal(entryAmount({ project: "website", shift: "night", hours: 2 }), 210);
  assert.equal(invoiceTotal([newEntry("website"), newEntry("mobile-app")]), 1400);
});

test("an unknown project is an error, not NaN", () => {
  assert.throws(() => entryAmount(newEntry("intranet")), /Unknown project: intranet/);
});
