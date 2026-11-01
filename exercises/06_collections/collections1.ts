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

// TODO: Keys are client ids (strings), values are request counts.
const requestCounts = new Map();

// Counts one more request for `clientId` and returns the client's new count.
function recordRequest(clientId: string): number {
  const count = requestCounts.get(clientId) + 1;
  requestCounts.set(clientId, count);
  return count;
}

// How many requests `clientId` may still make.
function remaining(clientId: string): number {
  if (requestCounts.has(clientId)) {
    return Math.max(0, LIMIT - requestCounts.get(clientId));
  }
  return LIMIT;
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
