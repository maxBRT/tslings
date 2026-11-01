// An array literal is inferred as an array, not a tuple: `[1280, 720]` is a
// `number[]`, because TypeScript assumes you may push to it later. That loses
// the length, so you can't spread it into a function that takes exactly two
// numbers.
//
// Two ways to keep a tuple a tuple:
// - for a function, annotate its return type: `(): [width: number, height: number]`.
//   That's how React's `useState` returns its `[state, setState]` pair.
// - for a constant, `as const` turns the literal into a readonly tuple of
//   literal types: `readonly [1280, 720]`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function resizeWindow(width: number, height: number): string {
  return `window resized to ${width}x${height}`;
}

// TODO: Make this a readonly tuple of literal types, with `as const`.
const DEFAULT_SIZE = [1280, 720];

// TODO: Give `parseSize` a tuple return type, with labels.
function parseSize(input: string) {
  const [width = "0", height = "0"] = input.split("x");
  return [Number(width), Number(height)];
}

function resetWindow(): string {
  return resizeWindow(...DEFAULT_SIZE);
}

function applySize(input: string): string {
  return resizeWindow(...parseSize(input));
}

// Don't change the tests below.

test("reset to the default size", () => {
  assert.equal(resetWindow(), "window resized to 1280x720");
});

test("apply a size typed by the user", () => {
  assert.equal(applySize("1920x1080"), "window resized to 1920x1080");
  assert.deepEqual(parseSize("800x600"), [800, 600]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<typeof DEFAULT_SIZE, readonly [1280, 720]>>,
  Expect<Equal<ReturnType<typeof parseSize>, [number, number]>>,
];
