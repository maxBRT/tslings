import { test } from "node:test";
import assert from "node:assert/strict";
import type { Square } from "./shapes.ts";

// TODO: Return the area of the square.
function area(square: Square): number {
  return `${square.side * square.side}`;
}

test("area of a square", () => {
  assert.equal(area({ side: 3 }), 9);
});
