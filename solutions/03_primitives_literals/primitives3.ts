import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// `null` here means "no average", which is different from an average of 0.
// Many codebases use `undefined` for missing values instead (like `Array.prototype.find`
// does), while JSON can only express `null`. Either is fine: pick one and stick to it.
function averageRating(ratings: number[]): number | null {
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
  if (average === null) {
    return "No reviews yet";
  }
  // After the check, TypeScript knows `average` is a `number`.
  return `${average.toFixed(1)} / 5`;
}

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
