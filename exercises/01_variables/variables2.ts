// TypeScript infers a variable's type from the value you initialize it with, so local
// variables rarely need an annotation: `let count = 0` is already a `number`. (In an
// editor, hover over a variable to see the type TypeScript inferred.)
//
// The type is fixed at the declaration: every value you assign later must fit it. So the
// initial value matters, and here it gives `longest` the wrong type.
//
// TODO: Fix `longestTagLength`. You don't need any type annotation.

import { test } from "node:test";
import assert from "node:assert/strict";

// Used to size the "Tags" column of a table: returns the length of the longest tag.
function longestTagLength(tags: string[]): number {
  let longest = "";
  for (const tag of tags) {
    if (tag.length > longest) {
      longest = tag.length;
    }
  }
  return longest;
}

// Don't change the tests below.

test("finds the longest tag", () => {
  assert.equal(longestTagLength(["node", "typescript", "rust"]), 10);
});

test("the longest tag can be anywhere", () => {
  assert.equal(longestTagLength(["css", "js", "webassembly", "go"]), 11);
});

test("no tags means a width of 0", () => {
  assert.equal(longestTagLength([]), 0);
});
