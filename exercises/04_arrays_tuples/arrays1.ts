// An array type is written `T[]`: `string[]`, `number[]`. `Array<T>` is the
// same type with another spelling; most code uses `T[]`.
//
// When a function only reads an array, type the parameter `readonly T[]`
// (or `ReadonlyArray<T>`). Callers can still pass any array, and TypeScript
// removes the methods that would change it (`push`, `sort`, `reverse`,
// `splice`...), so the function can't mutate the caller's data by accident.
//
// A game shows its leaderboard from the scores below, in the order they were
// submitted. Annotate `averageScore`, then fix the bug TypeScript finds in `topThree`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: `scores` is a list of numbers that this function only reads.
function averageScore(scores): number {
  if (scores.length === 0) return 0;
  let total = 0;
  for (const score of scores) total += score;
  return total / scores.length;
}

const highestFirst = (a: number, b: number): number => b - a;

function topThree(scores: readonly number[]): number[] {
  // TODO: Return the three highest scores, highest first, without reordering
  // the caller's array. Keep the `readonly` parameter.
  return scores.sort(highestFirst).slice(0, 3);
}

// Don't change the tests below.

test("average of the scores", () => {
  assert.equal(averageScore([120, 340, 90, 560, 210]), 264);
  assert.equal(averageScore([]), 0);
});

test("top three scores, highest first", () => {
  assert.deepEqual(topThree([120, 340, 90, 560, 210]), [560, 340, 210]);
  assert.deepEqual(topThree([42]), [42]);
});

test("the leaderboard keeps its submission order", () => {
  const scores = [120, 340, 90, 560, 210];
  topThree(scores);
  assert.deepEqual(scores, [120, 340, 90, 560, 210]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<Parameters<typeof averageScore>[0], readonly number[]>>,
  Expect<Equal<Parameters<typeof topThree>[0], readonly number[]>>,
];
