// For a `const`, TypeScript infers the most precise type it can: `const method = "GET"`
// has the type `"GET"`, a literal type that only that exact string fits. A `let` may be
// reassigned later, so TypeScript widens `let method = "GET"` to `string`.
//
// The difference matters as soon as a function only accepts a few specific strings.
// `request` below takes `"GET" | "POST" | "DELETE"`: one of these three strings, nothing
// else. (You'll write types like this yourself in chapter 03.)
//
// TODO: Make the call to `request` compile, without changing `request`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function request(method: "GET" | "POST" | "DELETE", path: string): string {
  return `${method} https://api.example.com${path}`;
}

let method = "GET";
let path = "/users/42";
const requestLine = request(method, path);

// Don't change the tests below.

test("builds the request line", () => {
  assert.equal(requestLine, "GET https://api.example.com/users/42");
});

// Type-level tests: they compile only if both sides are exactly the same type.
type _tests = [
  Expect<Equal<typeof method, "GET">>,
  Expect<Equal<Parameters<typeof request>, ["GET" | "POST" | "DELETE", string]>>,
];
