// `keyof T` is the union of T's property names: for
// `{ name: string; price: number }` it is `"name" | "price"`. As a parameter
// type it accepts any key of T and nothing else, so a typo such as
// `sortBy(products, "prcie")` no longer compiles. (Chapter 15 goes further.)
//
// A plain `string` key can't work: nothing guarantees that `a[key]` exists.
//
// Fix the type of `key` so `sortBy` compiles and stays generic.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Returns a sorted copy, smallest first. `toSorted` never mutates `items`.
// `key: keyof T` is enough here. A second type parameter
// (`<T, K extends keyof T>(items: readonly T[], key: K)`) would only be worth
// it if the return type depended on which key was passed.
function sortBy<T>(items: readonly T[], key: keyof T): T[] {
  return items.toSorted((a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  });
}

// Don't change the tests below.

interface Product {
  name: string;
  priceCents: number;
  addedAt: Date;
}

const products: readonly Product[] = [
  { name: "Mug", priceCents: 1200, addedAt: new Date("2026-03-01") },
  { name: "Cap", priceCents: 2500, addedAt: new Date("2026-01-15") },
  { name: "Bag", priceCents: 900, addedAt: new Date("2026-02-10") },
];

const names = (list: readonly Product[]): string[] => list.map((product) => product.name);

test("sorts by price", () => {
  const sorted = sortBy(products, "priceCents");
  type _test = Expect<Equal<typeof sorted, Product[]>>;
  assert.deepEqual(names(sorted), ["Bag", "Mug", "Cap"]);
});

test("sorts by name", () => {
  assert.deepEqual(names(sortBy(products, "name")), ["Bag", "Cap", "Mug"]);
});

test("sorts by date", () => {
  assert.deepEqual(names(sortBy(products, "addedAt")), ["Cap", "Bag", "Mug"]);
});

test("does not mutate its input", () => {
  sortBy(products, "priceCents");
  assert.deepEqual(names(products), ["Mug", "Cap", "Bag"]);
});

test("works for any kind of item", () => {
  const cities = [
    { city: "Lyon", population: 522_000 },
    { city: "Nantes", population: 323_000 },
  ];
  const sorted = sortBy(cities, "population");
  type _test = Expect<Equal<typeof sorted, { city: string; population: number }[]>>;
  assert.deepEqual(sorted.map((entry) => entry.city), ["Nantes", "Lyon"]);
});
