import { test } from "node:test";
import assert from "node:assert/strict";

function longestTagLength(tags: string[]): number {
  // Initialized with a number, so `longest` is inferred as `number`.
  // `let longest: number = 0` would work too, but the annotation repeats what TypeScript
  // already knows.
  let longest = 0;
  for (const tag of tags) {
    if (tag.length > longest) {
      longest = tag.length;
    }
  }
  return longest;
}

test("finds the longest tag", () => {
  assert.equal(longestTagLength(["node", "typescript", "rust"]), 10);
});

test("the longest tag can be anywhere", () => {
  assert.equal(longestTagLength(["css", "js", "webassembly", "go"]), 11);
});

test("no tags means a width of 0", () => {
  assert.equal(longestTagLength([]), 0);
});
