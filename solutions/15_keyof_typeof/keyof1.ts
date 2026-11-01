// In JavaScript, `typeof x` runs at runtime and returns a string such as
// "object". In a TYPE position, TypeScript's `typeof x` means "the type of the
// value x". Write the value once, derive its type from it, and the two can
// never drift apart: add a field to the object and the type has it too.
//
// Look at what gets inferred for a plain object: `"system"` becomes `string`
// and `14` becomes `number`, because its properties could be reassigned.
//
// Replace the hand-written `Settings` type with one derived from the defaults.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const DEFAULT_SETTINGS = {
  theme: "system",
  fontSize: 14,
  editor: { tabSize: 2, wordWrap: true },
  recentFiles: ["README.md"],
};

// The value is the single source of truth, the type follows it.
// Deriving the type from the value fits when the value comes first, like these
// defaults. When the shape is the contract (an API payload, a function's
// options), write the interface first and annotate the value with it.
type Settings = typeof DEFAULT_SETTINGS;

function withFontSize(settings: Settings, fontSize: number): Settings {
  return { ...settings, fontSize };
}

function describeEditor(settings: Settings): string {
  const { tabSize, wordWrap } = settings.editor;
  return `indent ${tabSize} spaces, word wrap ${wordWrap ? "on" : "off"}`;
}

// Don't change the tests below.

test("describes the editor settings", () => {
  assert.equal(describeEditor(DEFAULT_SETTINGS), "indent 2 spaces, word wrap on");
});

test("changes the font size without touching the rest", () => {
  const bigger = withFontSize(DEFAULT_SETTINGS, 18);
  assert.equal(bigger.fontSize, 18);
  assert.deepEqual(bigger.recentFiles, ["README.md"]);
  assert.equal(DEFAULT_SETTINGS.fontSize, 14);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<
    Equal<
      Settings,
      {
        theme: string;
        fontSize: number;
        editor: { tabSize: number; wordWrap: boolean };
        recentFiles: string[];
      }
    >
  >,
];
