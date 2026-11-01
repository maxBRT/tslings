// Three utility types filter the members of a union:
//   Exclude<T, U>    drops the members of T that are assignable to U
//   Extract<T, U>    keeps only the members of T that are assignable to U
//   NonNullable<T>   drops `null` and `undefined`
// On a discriminated union, `Extract<AppEvent, { type: "click" }>` picks the
// member with that tag, so you never have to copy a member out by hand.
//
// Fix the three types marked TODO so the functions below them compile.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type AppEvent =
  | { type: "page_view"; path: string }
  | { type: "click"; target: string }
  | { type: "key_down"; key: string }
  | { type: "key_up"; key: string }
  | { type: "error"; message: string };

interface Session {
  id: string;
  userId: string | null; // null until the visitor logs in
}

// Each member of AppEvent is tested on its own: the two whose `type` fits
// `"key_down" | "key_up"` are kept.
type KeyEvent = Extract<AppEvent, { type: "key_down" | "key_up" }>;

// `AppEvent["type"]` is the union of all tags; `Exclude` removes one of them.
// Add a new event type to AppEvent, and `countTracked` stops compiling until
// it counts it too: the `Record` must have a key for every tracked type.
type TrackedType = Exclude<AppEvent["type"], "error">;

type UserId = NonNullable<Session["userId"]>;

function describeKey(event: KeyEvent): string {
  return `${event.type === "key_down" ? "pressed" : "released"} ${event.key}`;
}

function countTracked(events: readonly AppEvent[]): Record<TrackedType, number> {
  const counts: Record<TrackedType, number> = { page_view: 0, click: 0, key_down: 0, key_up: 0 };
  for (const event of events) {
    if (event.type !== "error") counts[event.type] += 1;
  }
  return counts;
}

// The type moves the null check to the caller, who knows whether the visitor
// is logged in; this function no longer has to guess what to return for null.
function shortUserId(id: UserId): string {
  return id.slice(0, 8);
}

// Don't change the tests below.

test("describes keyboard events", () => {
  assert.equal(describeKey({ type: "key_down", key: "Enter" }), "pressed Enter");
  assert.equal(describeKey({ type: "key_up", key: "Escape" }), "released Escape");
});

test("counts every tracked event type", () => {
  const counts = countTracked([
    { type: "page_view", path: "/" },
    { type: "click", target: "buy-button" },
    { type: "error", message: "Payment widget failed to load" },
    { type: "page_view", path: "/checkout" },
  ]);
  assert.deepEqual(counts, { page_view: 2, click: 1, key_down: 0, key_up: 0 });
});

test("shortens a user id", () => {
  assert.equal(shortUserId("usr_4f9a2c71e0"), "usr_4f9a");
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<KeyEvent, { type: "key_down"; key: string } | { type: "key_up"; key: string }>>,
  Expect<Equal<TrackedType, "page_view" | "click" | "key_down" | "key_up">>,
  Expect<Equal<UserId, string>>,
];
