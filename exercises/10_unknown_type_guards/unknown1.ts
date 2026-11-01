// `unknown` is the safe counterpart of `any`. Any value can go INTO an `unknown`, but
// TypeScript won't let you do anything WITH it (compare it, read a property, do math) until
// you've checked what it is. `any` is the opposite: it allows everything and checks nothing.
//
// `JSON.parse` returns `any`, which quietly spreads into everything it touches. Experienced
// TypeScript developers store its result in an `unknown` right away, so the compiler reminds
// them that the data could be anything.
//
// The editor settings below come from a JSON file that users edit by hand. Make `fontSize`
// return the stored size when it's a positive, finite number, and the default size otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";

const DEFAULT_FONT_SIZE = 14;

function fontSize(json: string): number {
  // Keep this annotation: it's what makes TypeScript check your code.
  const stored: unknown = JSON.parse(json);

  // TODO: `stored` may be a number, but also a string, `null`, `true`, an array...
  // Check what it is before using it.
  return stored > 0 ? stored : DEFAULT_FONT_SIZE;
}

// Don't change the tests below.

test("a positive number is used as is", () => {
  assert.equal(fontSize("16"), 16);
  assert.equal(fontSize("12.5"), 12.5);
});

test("zero and negative numbers fall back to the default", () => {
  assert.equal(fontSize("0"), DEFAULT_FONT_SIZE);
  assert.equal(fontSize("-3"), DEFAULT_FONT_SIZE);
});

test("values that are not numbers fall back to the default", () => {
  assert.equal(fontSize('"16"'), DEFAULT_FONT_SIZE);
  assert.equal(fontSize("[20]"), DEFAULT_FONT_SIZE);
  assert.equal(fontSize("true"), DEFAULT_FONT_SIZE);
  assert.equal(fontSize("null"), DEFAULT_FONT_SIZE);
});

test("infinity is not a font size", () => {
  // JSON.parse("1e999") is Infinity.
  assert.equal(fontSize("1e999"), DEFAULT_FONT_SIZE);
});
