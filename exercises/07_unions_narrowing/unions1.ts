// A union type `A | B` means "an A or a B". UI components often accept a CSS
// length either as a number of pixels (`12`) or as a string with its unit
// (`"50%"`, `"2rem"`), so the prop is typed `number | string`.
//
// On a union, TypeScript only lets you use what every member has:
// `value.toString()` is fine, `value.trim()` is not, because numbers have no
// `trim`. Narrow the type first to use string methods. Inside
// `if (typeof value === "string") { ... }`, TypeScript knows `value` is a string.
//
// Make `toCssLength` handle both kinds of values.

import { test } from "node:test";
import assert from "node:assert/strict";

function toCssLength(value: number | string): string {
  // TODO: Numbers are pixels: 12 becomes "12px", except 0, which needs no
  // unit and becomes "0". Strings already have a unit: return them without
  // the spaces around them.
  return value.trim();
}

// Don't change the tests below.

test("numbers are pixels", () => {
  assert.equal(toCssLength(12), "12px");
  assert.equal(toCssLength(0.5), "0.5px");
});

test("zero needs no unit", () => {
  assert.equal(toCssLength(0), "0");
});

test("strings keep their unit", () => {
  assert.equal(toCssLength("50%"), "50%");
  assert.equal(toCssLength("  2.5rem "), "2.5rem");
});
