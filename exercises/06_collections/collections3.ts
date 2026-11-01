// Record or Map?
// - Keys known in advance (a union like `Zone`): a `Record<Zone, V>` object.
//   TypeScript checks that every key is there, and reading one is always safe.
// - Keys that come from data (user ids, words, URLs): a `Map<K, V>`.
//
// `Object.keys` and `Object.entries` type their keys as `string`, even for a
// `Record<Zone, number>`. That's structural typing again: a value of that type
// may have more properties at runtime than its type lists, so TypeScript can't
// promise every key is a `Zone`. Don't loop over `Object.keys` to index back
// into the object; `Object.entries` gives you each key with its value.
//
// A shop ships to three zones, known in advance. Fix both TODOs.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Zone = "domestic" | "eu" | "world";

// TODO: Use a Record instead, so that TypeScript can check that every zone
// has a rate. Shipping to the world zone costs 30.
const SHIPPING_RATE = new Map<Zone, number>([
  ["domestic", 5],
  ["eu", 12],
]);

function rateFor(zone: Zone): number {
  return SHIPPING_RATE.get(zone);
}

// TODO: One line per zone, like "eu: $12", without indexing `rates` with a
// `string`.
function rateList(rates: Record<Zone, number>): string[] {
  return Object.keys(rates).map((zone) => `${zone}: $${rates[zone]}`);
}

// Don't change the tests below.

test("rate of a zone", () => {
  assert.equal(rateFor("domestic"), 5);
  assert.equal(rateFor("eu"), 12);
  assert.equal(rateFor("world"), 30);
});

test("rate list", () => {
  assert.deepEqual(rateList(SHIPPING_RATE), ["domestic: $5", "eu: $12", "world: $30"]);
  assert.deepEqual(rateList({ domestic: 4, eu: 15, world: 45 }), [
    "domestic: $4",
    "eu: $15",
    "world: $45",
  ]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<typeof SHIPPING_RATE, Record<Zone, number>>>,
  Expect<Equal<Zone, "domestic" | "eu" | "world">>,
  // `rateList` keeps its `Record<Zone, number>` parameter.
  Expect<Equal<Parameters<typeof rateList>[0], Record<Zone, number>>>,
];
