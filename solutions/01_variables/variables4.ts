import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function request(method: "GET" | "POST" | "DELETE", path: string): string {
  return `${method} https://api.example.com${path}`;
}

// Neither value changes, so both are `const`. That also gives `method` the literal type
// `"GET"`, which fits `request`'s parameter. (`path` is `"/users/42"`, which fits `string`.)
const method = "GET";
const path = "/users/42";
const requestLine = request(method, path);

test("builds the request line", () => {
  assert.equal(requestLine, "GET https://api.example.com/users/42");
});

type _tests = [
  Expect<Equal<typeof method, "GET">>,
  Expect<Equal<Parameters<typeof request>, ["GET" | "POST" | "DELETE", string]>>,
];
