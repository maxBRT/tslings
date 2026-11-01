// `array.find(...)` returns `T | undefined`, since maybe nothing matched. When you
// write a lookup function, you choose how it reports "not found":
//   - return `T | undefined` when absence is a normal outcome (a customer
//     typed a product code that doesn't exist). The type forces every caller
//     to handle it.
//   - throw when absence means a bug or corrupted data (an order line points
//     at a product that isn't in the catalog). Callers get a plain `T`.
// A common naming convention: `findX` may return undefined, `getX` throws.
//
// Make `findProduct` honest, then write `getProduct` and fix the callers that
// TypeScript points at.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Product = { sku: string; name: string; priceCents: number };

const catalog: readonly Product[] = [
  { sku: "MUG-01", name: "Mug", priceCents: 1200 },
  { sku: "TEE-02", name: "T-shirt", priceCents: 2500 },
];

// TODO: `find` may come back empty-handed. Say so in the return type.
function findProduct(sku: string): Product {
  return catalog.find((product) => product.sku === sku);
}

// TODO: Use `findProduct`, and throw an Error that names the SKU
// ("Unknown SKU: XYZ-99") when there's no such product.
function getProduct(sku: string): Product {
  return findProduct(sku);
}

// What the search box shows: the price, or "No product with code ..." when
// the customer typed an unknown code.
function searchResult(sku: string): string {
  const product = findProduct(sku);
  return `${product.name}: ${(product.priceCents / 100).toFixed(2)}`;
}

// Every order line was validated when the order was placed, so an unknown SKU
// here is a bug, and throwing is right.
function lineTotalCents(line: { sku: string; quantity: number }): number {
  return getProduct(line.sku).priceCents * line.quantity;
}

// Don't change the tests below.

test("search finds a product", () => {
  assert.equal(searchResult("MUG-01"), "Mug: 12.00");
});

test("search handles unknown codes", () => {
  assert.equal(searchResult("NOPE-00"), "No product with code NOPE-00");
});

test("line totals", () => {
  assert.equal(lineTotalCents({ sku: "TEE-02", quantity: 3 }), 7500);
});

test("an unknown SKU in an order is an error", () => {
  assert.throws(() => lineTotalCents({ sku: "XYZ-99", quantity: 1 }), {
    message: "Unknown SKU: XYZ-99",
  });
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<ReturnType<typeof findProduct>, Product | undefined>>,
  Expect<Equal<ReturnType<typeof getProduct>, Product>>,
];
