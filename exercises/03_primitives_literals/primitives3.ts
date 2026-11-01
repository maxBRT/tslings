// With `strict` on, `null` and `undefined` are types of their own: a `number` is always a
// number, never `null`. When a value can be missing, its type has to say so, with a union:
// `number | null` means "a number, or null".
//
// TypeScript then makes every caller deal with `null` before using the value. That rules
// out one of the most common JavaScript crashes: "Cannot read properties of null".
//
// TODO: `averageRating` returns `null` for a product without reviews. Make its return type
// say so, then handle that case in `ratingLabel`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function averageRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return null;
  }
  let sum = 0;
  for (const rating of ratings) {
    sum += rating;
  }
  return sum / ratings.length;
}

function ratingLabel(ratings: number[]): string {
  const average = averageRating(ratings);
  return `${average.toFixed(1)} / 5`;
}

// Don't change the tests below.

test("averages the ratings", () => {
  assert.equal(averageRating([4, 5]), 4.5);
  assert.equal(averageRating([3]), 3);
});

test("no reviews, no average", () => {
  assert.equal(averageRating([]), null);
});

test("labels", () => {
  assert.equal(ratingLabel([4, 5, 5]), "4.7 / 5");
  assert.equal(ratingLabel([]), "No reviews yet");
});

type _tests = [Expect<Equal<ReturnType<typeof averageRating>, number | null>>];
