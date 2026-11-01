// `Map<K, V>` is the dictionary to use when keys come from data (user ids,
// URLs, words): any key type, no inherited keys like `constructor`, a `size`,
// and insertion order. Give an empty Map its types up front with
// `new Map<string, number>()`: with no type arguments and no entries to infer
// from, it's a `Map<any, any>`, and TypeScript stops checking everything you
// put in or take out.
//
// `map.get(key)` returns `V | undefined`, because the key may not be there.
// `map.has(key)` doesn't change that: TypeScript doesn't connect the two calls.
// Call `get` once and check the value it returned.
//
// A rate limiter counts requests per client. Type the store, then fix the two
// errors TypeScript finds.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const LIMIT = 3;

const requestCounts = new Map<string, number>();

// Counts one more request for `clientId` and returns the client's new count.
function recordRequest(clientId: string): number {
  // A client we haven't seen yet has made 0 requests.
  const count = (requestCounts.get(clientId) ?? 0) + 1;
  requestCounts.set(clientId, count);
  return count;
}

// How many requests `clientId` may still make.
function remaining(clientId: string): number {
  // One `get`, then a check on its result: TypeScript narrows `count` to
  // `number` after the `undefined` check, which `has` can't do.
  const count = requestCounts.get(clientId);
  if (count === undefined) return LIMIT;
  return Math.max(0, LIMIT - count);
}

// Don't change the tests below.

test("counts requests per client", () => {
  assert.equal(recordRequest("alice"), 1);
  assert.equal(recordRequest("alice"), 2);
  assert.equal(recordRequest("bob"), 1);
  assert.equal(requestCounts.size, 2);
});

test("remaining requests", () => {
  recordRequest("carol");
  assert.equal(remaining("carol"), 2);
  assert.equal(remaining("dave"), LIMIT);
  for (let i = 0; i < 5; i++) recordRequest("eve");
  assert.equal(remaining("eve"), 0);
});

test("works for any client id, even 'constructor'", () => {
  assert.equal(recordRequest("constructor"), 1);
  assert.equal(remaining("toString"), LIMIT);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [Expect<Equal<typeof requestCounts, Map<string, number>>>];
