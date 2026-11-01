// A generic function has a type parameter, written in angle brackets: `<T>`.
// It's a placeholder for a type, like a parameter is a placeholder for a
// value. Each call fills it in, usually by inference from the arguments:
// for `unique(["a", "b"])`, TypeScript sets `T` to `string` on its own.
//
// `unknown` is safe but forgetful: whatever goes in, `unknown` comes out, and
// every caller has to check the values again. (`any` forgets too, and turns
// checking off.) A type parameter remembers what went in.
//
// Make `unique` generic so callers get back the element type they passed in.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Returns the items without duplicates, in their first-seen order.
// `T` appears twice: in the parameter and in the return type. That link is
// what makes it useful: the type that goes in is the type that comes out.
function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

// Don't change the tests below.

test("removes duplicate tags", () => {
  const tags = unique(["sale", "new", "sale"]);
  type _test = Expect<Equal<typeof tags, string[]>>;
  assert.deepEqual(tags.map((tag) => tag.toUpperCase()), ["SALE", "NEW"]);
});

test("removes duplicate ids", () => {
  const ids = unique([3, 1, 3, 2, 1]);
  type _test = Expect<Equal<typeof ids, number[]>>;
  assert.equal(ids.reduce((sum, id) => sum + id, 0), 6);
});

test("an empty list needs an explicit type argument", () => {
  // There is nothing to infer `T` from here, so the caller passes it in.
  const none = unique<string>([]);
  type _test = Expect<Equal<typeof none, string[]>>;
  assert.deepEqual(none, []);
});
