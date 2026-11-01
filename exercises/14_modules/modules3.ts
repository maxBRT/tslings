// A module shares only what it exports. Everything else is private to its file, which is how
// TypeScript code hides helpers without needing a class.
//
// The tests at the bottom import this very file, the way the rest of an app would:
// `import * as flags from "./modules3.ts"` collects all its exports in one object, so
// `flags.isEnabled` is the exported `isEnabled`. The tests can only see what is exported.
//
// Prefer named exports to `export default`. A named export has the same name in every file
// that imports it, so search, rename and auto-import just work. A default export gets
// whatever name each importer picks, and shows up as `default` on `flags`.
//
// TODO: Make `Flag` and `isEnabled` named exports. `bucketOf` is an implementation detail:
// make it private.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";
import * as flags from "./modules3.ts";

type Flag = "new-checkout" | "dark-mode" | "search-v2";

/** Share of users, in percent, who get each flag. */
export const ROLLOUT: Readonly<Record<Flag, number>> = {
  "new-checkout": 25,
  "dark-mode": 100,
  "search-v2": 0,
};

/** Puts a user in a bucket from 0 to 99. The same user always gets the same bucket. */
export function bucketOf(userId: string): number {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  }
  return hash % 100;
}

export default function isEnabled(flag: Flag, userId: string): boolean {
  return bucketOf(userId) < ROLLOUT[flag];
}

// Don't change the tests below.

/** The users who get `flag`. */
function usersWith(flag: flags.Flag, users: readonly string[]): string[] {
  return users.filter((user) => flags.isEnabled(flag, user));
}

test("dark mode is on for everyone, search v2 for no one", () => {
  const users = ["ada", "grace", "linus"];
  assert.deepEqual(usersWith("dark-mode", users), users);
  assert.deepEqual(usersWith("search-v2", users), []);
});

test("the new checkout goes to about a quarter of users", () => {
  assert.deepEqual(usersWith("new-checkout", ["ada", "grace", "linus"]), ["ada"]);
  const many = usersWith(
    "new-checkout",
    Array.from({ length: 1000 }, (_, i) => `user_${i}`),
  );
  assert.ok(many.length > 200 && many.length < 300, `${many.length} of 1000 users got it`);
});

test("only the public API is exported", () => {
  assert.deepEqual(Object.keys(flags), ["ROLLOUT", "isEnabled"]);
});

type _tests = [
  Expect<Equal<flags.Flag, "new-checkout" | "dark-mode" | "search-v2">>,
  Expect<Equal<keyof typeof flags, "ROLLOUT" | "isEnabled">>,
];
