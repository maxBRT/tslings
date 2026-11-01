// Array methods infer their types from the callback: `prices.map((p) => p * 1.2)`
// is a `number[]` without a single annotation, and so is the result of
// `reduce((sum, p) => sum + p, 0)`, whose type comes from the initial value `0`.
//
// `filter` can do more: when its callback checks the type of its argument, like
// `(x) => x !== undefined`, TypeScript (5.5+) infers a "type predicate" and the
// filtered array loses `undefined`. The JavaScript habit `.filter(Boolean)` gets
// no such treatment, and it also throws away `0` and `""`.
//
// A survey asks customers how likely they are to recommend the product, from 0 to
// 10, and the answers arrive from the form as text. Fix `validScores`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function parseScore(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const score = Number(input);
  return Number.isInteger(score) && score >= 0 && score <= 10 ? score : undefined;
}

function validScores(inputs: readonly string[]): number[] {
  // TODO: Keep every score that parsed, and nothing else.
  return inputs.map(parseScore).filter(Boolean);
}

// Net Promoter Score: the percentage of promoters (9 or 10) minus the percentage of
// detractors (0 to 6), from -100 to 100. No answers, no score.
function netPromoterScore(inputs: readonly string[]): number | null {
  const scores = validScores(inputs);
  if (scores.length === 0) return null;
  const promoters = scores.filter((score) => score >= 9).length;
  const detractors = scores.filter((score) => score <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

// Don't change the tests below.

test("drops what isn't a score", () => {
  assert.deepEqual(validScores(["9", "ten", "", "10", "11", "7.5"]), [9, 10]);
});

test("zero is a score too", () => {
  assert.deepEqual(validScores(["0", "8", "0"]), [0, 8, 0]);
});

test("net promoter score", () => {
  // Two promoters (10 and 9), one passive (7), one detractor (0): (2 - 1) / 4.
  assert.equal(netPromoterScore(["10", "oops", "0", "9", "7"]), 25);
  assert.equal(netPromoterScore(["0", "3"]), -100);
  assert.equal(netPromoterScore(["?"]), null);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [Expect<Equal<ReturnType<typeof validScores>, number[]>>];
