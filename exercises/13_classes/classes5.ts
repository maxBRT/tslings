// `enum` is one of the few TypeScript features that generate JavaScript: the compiler turns it
// into an object. Node only erases types, so it can't run enums (`erasableSyntaxOnly`), and
// many TypeScript teams avoid them anyway. The usual replacements:
//   - a union of string literals, `type Status = "open" | "closed"`, when you only need a type;
//   - an object marked `as const`, when you also need the values at runtime (to list them, or
//     to write `Status.Open`), with a type of the same name derived from it:
//       const Status = { Open: "open", Closed: "closed" } as const;
//       type Status = (typeof Status)[keyof typeof Status]; // "open" | "closed"
//     `keyof` gives the union of a type's keys, here "Open" | "Closed" (chapter 15 covers it).
//     A value and a type can share a name: TypeScript knows which one you mean from where you
//     use it.
//
// Replace the `Priority` enum of the support desk, so that tickets and tests work unchanged.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: Replace this enum with an `as const` object and a type, both named `Priority`.
enum Priority {
  Low = "low",
  Normal = "normal",
  High = "high",
  Urgent = "urgent",
}

// How many hours support has to answer a ticket.
const RESPONSE_HOURS: Record<Priority, number> = {
  [Priority.Low]: 72,
  [Priority.Normal]: 24,
  [Priority.High]: 8,
  [Priority.Urgent]: 1,
};

const HOUR_MS = 60 * 60 * 1000;

class Ticket {
  readonly title: string;
  readonly #priority: Priority;
  readonly #openedAt: Date;

  constructor(title: string, priority: Priority, openedAt: Date) {
    this.title = title;
    this.#priority = priority;
    this.#openedAt = openedAt;
  }

  label(): string {
    return `[${this.#priority.toUpperCase()}] ${this.title}`;
  }

  dueAt(): Date {
    return new Date(this.#openedAt.getTime() + RESPONSE_HOURS[this.#priority] * HOUR_MS);
  }
}

// Don't change the tests below.

const openedAt = new Date("2026-11-02T09:00:00Z");

test("higher priorities are due sooner", () => {
  const outage = new Ticket("Checkout returns 500", Priority.Urgent, openedAt);
  assert.equal(outage.label(), "[URGENT] Checkout returns 500");
  assert.deepEqual(outage.dueAt(), new Date("2026-11-02T10:00:00Z"));
  const typo = new Ticket("Typo on the pricing page", Priority.Low, openedAt);
  assert.deepEqual(typo.dueAt(), new Date("2026-11-05T09:00:00Z"));
});

test("plain strings work too", () => {
  // A string enum would reject "high": enums only accept their own members.
  const ticket = new Ticket("CSV export times out", "high", openedAt);
  assert.equal(ticket.label(), "[HIGH] CSV export times out");
  assert.deepEqual(ticket.dueAt(), new Date("2026-11-02T17:00:00Z"));
});

test("the priorities can be listed at runtime", () => {
  assert.deepEqual(Object.values(Priority), ["low", "normal", "high", "urgent"]);
});

type _tests = [
  Expect<Equal<Priority, "low" | "normal" | "high" | "urgent">>,
  Expect<Equal<typeof Priority.High, "high">>,
];
