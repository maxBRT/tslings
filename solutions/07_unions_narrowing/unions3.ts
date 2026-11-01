// `typeof` can't tell objects apart: it says "object" for a Date, an array and
// any plain object. For a union of object types, TypeScript narrows with:
//   - `value instanceof Date`: was the object created by that class?
//   - `"cron" in value`: does the object have that property?
//
// A job scheduler accepts three shapes for "when should this job run". When you
// design a type yourself, prefer a shared `kind` field (next chapter); `in` and
// `instanceof` are how you narrow shapes you don't control.
//
// Describe each schedule for the admin dashboard.

import { test } from "node:test";
import assert from "node:assert/strict";

type Schedule =
  | Date // run once, at that moment
  | { everyMinutes: number } // run repeatedly
  | { cron: string }; // run on a cron expression, like "0 9 * * 1"

function describeSchedule(schedule: Schedule): string {
  if (schedule instanceof Date) {
    return `once at ${schedule.toISOString()}`;
  }
  // `schedule` is `{ everyMinutes: number } | { cron: string }` here.
  if ("everyMinutes" in schedule) {
    return `every ${schedule.everyMinutes} minutes`;
  }
  return `on cron ${schedule.cron}`;
}

// Don't change the tests below.

test("a one-off date", () => {
  assert.equal(
    describeSchedule(new Date("2026-11-02T09:00:00Z")),
    "once at 2026-11-02T09:00:00.000Z",
  );
});

test("an interval", () => {
  assert.equal(describeSchedule({ everyMinutes: 15 }), "every 15 minutes");
});

test("a cron expression", () => {
  assert.equal(describeSchedule({ cron: "0 9 * * 1" }), "on cron 0 9 * * 1");
});
