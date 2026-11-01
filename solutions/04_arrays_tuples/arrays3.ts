// Array methods infer their types from the callback: `prices.map((p) => p * 1.2)`
// is a `number[]` without a single annotation, and so is the result of
// `reduce((sum, p) => sum + p, 0)`, whose type comes from the initial value `0`.
//
// `filter` can do more: when its callback checks the type of its argument, like
// `(x) => x !== undefined`, TypeScript (5.5+) infers a "type predicate" and the
// filtered array loses `undefined`. The JavaScript habit `.filter(Boolean)` gets
// no such treatment, and it also throws away `0` and `""`.
//
// Ratings come from a form as text, from 0 to 5 stars. Fix `validRatings`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function parseRating(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const stars = Number(input);
  return Number.isInteger(stars) && stars >= 0 && stars <= 5 ? stars : undefined;
}

function validRatings(inputs: readonly string[]): number[] {
  // TypeScript infers `(stars) => stars is number` from this arrow function,
  // so `filter` returns `number[]`. `typeof stars === "number"` works too.
  // Before TypeScript 5.5 you had to write the predicate yourself:
  // `.filter((stars): stars is number => stars !== undefined)`.
  return inputs.map(parseRating).filter((stars) => stars !== undefined);
}

function averageRating(inputs: readonly string[]): number {
  const ratings = validRatings(inputs);
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, stars) => sum + stars, 0) / ratings.length;
}

// Don't change the tests below.

test("drops what isn't a rating", () => {
  assert.deepEqual(validRatings(["4", "five", "", "5", "9", "3.5"]), [4, 5]);
});

test("zero stars is a rating too", () => {
  assert.deepEqual(validRatings(["0", "2", "0"]), [0, 2, 0]);
});

test("average rating", () => {
  assert.equal(averageRating(["4", "oops", "0", "5"]), 3);
  assert.equal(averageRating(["?"]), 0);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [Expect<Equal<ReturnType<typeof validRatings>, number[]>>];
