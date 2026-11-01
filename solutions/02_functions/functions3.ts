import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// From the outside, both parameters look the same: `pageSize?: number, search?: string`.
// Inside, `pageSize` is a `number` (the default fills it in) while `search` is
// `string | undefined`, which is why the `if` below is needed.
function productsUrl(page: number, pageSize = 20, search?: string): string {
  const offset = (page - 1) * pageSize;
  let url = `/api/products?offset=${offset}&limit=${pageSize}`;
  if (search !== undefined) {
    url += `&q=${encodeURIComponent(search)}`;
  }
  return url;
}

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
