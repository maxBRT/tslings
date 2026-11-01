// Some type tests check that code does NOT compile: reading a setting that doesn't exist, or
// storing a value of the wrong type, must be an error. `// @ts-expect-error` on the line above
// such a call says "the next line has a type error". If it does, the error is silenced. If it
// doesn't, TypeScript reports the directive itself ("Unused '@ts-expect-error' directive"), so
// the test fails the day the misuse starts compiling.
//
// That's why it is fine in tests and banned everywhere else in tslings: in a test the error is
// the expected result, while in normal code it hides a problem. (`@ts-ignore` is worse: it stays
// silent even after the error is gone.) Keep each expected-error line short, because the
// directive accepts ANY error on that line, including a typo you didn't mean to make.
//
// TODO: Put `// @ts-expect-error` above each misuse below. Then fix `createStore` so that the
// tests at the bottom pass as well.

import { test } from "node:test";
import assert from "node:assert/strict";

function createStore<State extends object>(initial: State) {
  const state = { ...initial };
  return {
    get<Key extends keyof State>(key: Key): State[Key] {
      return state[key];
    },
    set(key: keyof State, value: State[keyof State]): void {
      state[key] = value;
    },
  };
}

type Preferences = { theme: "light" | "dark"; fontSize: number; betaFeatures: boolean };

const preferences = createStore<Preferences>({
  theme: "light",
  fontSize: 14,
  betaFeatures: false,
});

// Misuses that must not compile. These functions are never called: they are only there to be
// type-checked, like a test file that only runs through the compiler.
const misuses = [
  () => preferences.get("colour"),
  () => preferences.set("colour", "red"),
  () => preferences.set("theme", "blue"),
];

// Don't change the tests below.

test("reads and writes preferences", () => {
  preferences.set("fontSize", 16);
  assert.equal(preferences.get("fontSize"), 16);
  assert.equal(preferences.get("theme"), "light");
});

test("the misuses are still there, unchanged", () => {
  assert.deepEqual(misuses.map(String), [
    '() => preferences.get("colour")',
    '() => preferences.set("colour", "red")',
    '() => preferences.set("theme", "blue")',
  ]);
});

const moreMisuses = [
  // A value that is valid for ANOTHER key must not compile either.
  // @ts-expect-error: `fontSize` takes a number
  () => preferences.set("fontSize", true),
];
