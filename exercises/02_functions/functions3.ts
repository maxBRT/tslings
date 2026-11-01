// Callers can leave out two kinds of parameters, and they look different inside the function:
//
// - A default value, `pageSize = 20`, makes the parameter optional for callers, and inside
//   the function it's always a `number`. TypeScript infers the type from the default.
// - A `?`, `search?: string`, makes it optional too, but inside the function its type is
//   `string | undefined`: you must handle the case where the caller left it out.
//
// Use a default when there's a sensible fallback value. Use `?` when there isn't one and
// "not given" has a meaning of its own, like "no search filter at all".
//
// TODO: Most callers only pass a page. Give `pageSize` a default of 20, and make `search`
// optional, so that every call in the tests compiles.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function productsUrl(page: number, pageSize: number, search: string): string {
  const offset = (page - 1) * pageSize;
  let url = `/api/products?offset=${offset}&limit=${pageSize}`;
  if (search !== undefined) {
    url += `&q=${encodeURIComponent(search)}`;
  }
  return url;
}

// Don't change the tests below.

test("the first page, with the default page size", () => {
  assert.equal(productsUrl(1), "/api/products?offset=0&limit=20");
});

test("a custom page size", () => {
  assert.equal(productsUrl(3, 50), "/api/products?offset=100&limit=50");
});

test("a search", () => {
  assert.equal(productsUrl(1, 10, "red shoes"), "/api/products?offset=0&limit=10&q=red%20shoes");
});

test("passing `undefined` uses the default", () => {
  assert.equal(productsUrl(2, undefined, "mug"), "/api/products?offset=20&limit=20&q=mug");
});

type _tests = [
  Expect<Equal<typeof productsUrl, (page: number, pageSize?: number, search?: string) => string>>,
];
