// Template literal types are template strings for types:
//
//   type Greeting = `hello ${string}`;   // any string that starts with "hello "
//   type Version = `v${number}`;         // "v1", "v2.5"... but not "vX"
//
// Put a union in a placeholder and you get every combination:
// `${"sm" | "lg"}-${"button" | "input"}` is "sm-button" | "sm-input" | "lg-button" | "lg-input".
// Design systems use this to type CSS values, so a typo like "12" (no unit) or
// "margin-tpo" fails to compile instead of failing silently in the browser.
//
// Extend `CssLength` to all three units and `SpacingProperty` to padding too.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Unit = "px" | "rem" | "%";
type Side = "top" | "right" | "bottom" | "left";

// The union in the placeholder expands to `${number}px` | `${number}rem` | `${number}%`.
type CssLength = `${number}${Unit}`;

// Two unions in one template: 2 x 4 = 8 property names.
type SpacingProperty = `${"margin" | "padding"}-${Side}`;

function px(value: number): CssLength {
  return `${value}px`;
}

function rem(value: number): CssLength {
  return `${value}rem`;
}

function percent(value: number): CssLength {
  return `${value}%`;
}

function declaration(property: SpacingProperty, value: CssLength): string {
  return `${property}: ${value};`;
}

function cardStyles(): string[] {
  return [
    declaration("margin-bottom", rem(1.5)),
    declaration("padding-left", px(12)),
    declaration("padding-top", percent(5)),
  ];
}

// Don't change the tests below.

test("card styles", () => {
  assert.deepEqual(cardStyles(), [
    "margin-bottom: 1.5rem;",
    "padding-left: 12px;",
    "padding-top: 5%;",
  ]);
});

// `true` when the string type `S` is a valid `CssLength`.
type IsLength<S extends string> = S extends CssLength ? true : false;

type _tests = [
  Expect<Equal<CssLength, `${number}px` | `${number}rem` | `${number}%`>>,
  Expect<Equal<IsLength<"-0.5rem">, true>>,
  Expect<Equal<IsLength<"12">, false>>,
  Expect<Equal<IsLength<"12em">, false>>,
  Expect<
    Equal<
      SpacingProperty,
      | "margin-top"
      | "margin-right"
      | "margin-bottom"
      | "margin-left"
      | "padding-top"
      | "padding-right"
      | "padding-bottom"
      | "padding-left"
    >
  >,
];
