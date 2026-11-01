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

import { test } from "node:test";
import assert from "node:assert/strict";

function createStore<State extends object>(initial: State) {
  const state = { ...initial };
  return {
    get<Key extends keyof State>(key: Key): State[Key] {
      return state[key];
    },
    // The old signature took any key and a value of ANY key's type (`State[keyof State]` is
    // the union of all value types), so `set("fontSize", true)` compiled. A type parameter ties
    // the value to the key that was passed.
    set<Key extends keyof State>(key: Key, value: State[Key]): void {
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
//
// Each directive says why the line must fail. It's only a comment, but it tells the next reader
// which error was meant, since the directive itself would accept any error on that line.
const misuses = [
  // @ts-expect-error: there is no `colour` preference
  () => preferences.get("colour"),
  // @ts-expect-error: there is no `colour` preference
  () => preferences.set("colour", "red"),
  // @ts-expect-error: `theme` is "light" or "dark"
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
