// A type guard is a function that checks a value and tells TypeScript what it found. Its return
// type is a "type predicate": `value is User` instead of `boolean`. When it returns `true`, the
// caller's value is narrowed to `User`, in an `if` and also in `array.filter(isUser)`.
//
// TypeScript does NOT check that the body matches the predicate: a guard that says `value is
// User` but checks too little lies to the compiler, just like `as` would. Check every field.
//
// The admin panel imports users from a JSON export, where some rows are broken. Fix `isUser`
// so that `activeEmails` type-checks and only keeps well-formed, active users.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type User = {
  id: number;
  email: string;
  active: boolean;
};

// TODO: This return type throws away what the function found out. Also, one field of `User`
// isn't checked yet.
function isUser(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

function activeEmails(rows: readonly unknown[]): string[] {
  return rows
    .filter(isUser)
    .filter((user) => user.active)
    .map((user) => user.email);
}

// Don't change the tests below.

const rows: unknown[] = [
  { id: 1, email: "ada@example.com", active: true },
  { id: 2, email: "grace@example.com", active: false },
  { id: 3, email: "linus@example.com", active: "false" },
  { id: "4", email: "margaret@example.com", active: true },
  { id: 5, active: true },
  null,
  "barbara@example.com",
  { id: 6, email: "ken@example.com", active: true, role: "admin" },
];

test("keeps active, well-formed users", () => {
  assert.deepEqual(activeEmails(rows), ["ada@example.com", "ken@example.com"]);
});

test("isUser checks every field", () => {
  assert.equal(isUser({ id: 1, email: "ada@example.com", active: true }), true);
  // An inactive user is still a well-formed `User`: `activeEmails` filters on `active` itself.
  assert.equal(isUser({ id: 2, email: "grace@example.com", active: false }), true);
  assert.equal(isUser({ id: 1, email: "ada@example.com", active: "yes" }), false);
  assert.equal(isUser({ id: 1, email: "ada@example.com" }), false);
  assert.equal(isUser({ id: 1, active: true }), false);
  assert.equal(isUser(null), false);
});

type _tests = [Expect<Equal<typeof isUser, (value: unknown) => value is User>>];
