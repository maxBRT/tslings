// A union of string literals is TypeScript's lightweight enum: a shop's "sort
// by" menu can only hold one of four values. `switch` narrows the value in each
// `case`, and TypeScript checks the cases against the union:
//   - a `case` value that isn't in the union is an error, so typos can't hide;
//   - when every member has a `case` that returns, TypeScript knows the
//     function always returns, with no `default` needed.
//
// TypeScript found two problems in `compareFor`. Fix them.

import { test } from "node:test";
import assert from "node:assert/strict";

type SortOrder = "newest" | "oldest" | "price-low" | "price-high";

type Product = { name: string; priceCents: number; addedAt: number };

function compareFor(order: SortOrder): (a: Product, b: Product) => number {
  // TODO: Make the switch handle every `SortOrder`. Cheapest first for
  // "price-low", most expensive first for "price-high".
  switch (order) {
    case "newest":
      return (a, b) => b.addedAt - a.addedAt;
    case "oldest":
      return (a, b) => a.addedAt - b.addedAt;
    case "price-asc":
      return (a, b) => a.priceCents - b.priceCents;
  }
}

function sortProducts(products: readonly Product[], order: SortOrder): string[] {
  return products.toSorted(compareFor(order)).map((product) => product.name);
}

// Don't change the tests below.

const products: Product[] = [
  { name: "mug", priceCents: 1200, addedAt: 10 },
  { name: "poster", priceCents: 2500, addedAt: 30 },
  { name: "sticker", priceCents: 300, addedAt: 20 },
];

test("by date", () => {
  assert.deepEqual(sortProducts(products, "newest"), ["poster", "sticker", "mug"]);
  assert.deepEqual(sortProducts(products, "oldest"), ["mug", "sticker", "poster"]);
});

test("by price", () => {
  assert.deepEqual(sortProducts(products, "price-low"), ["sticker", "mug", "poster"]);
  assert.deepEqual(sortProducts(products, "price-high"), ["poster", "mug", "sticker"]);
});
