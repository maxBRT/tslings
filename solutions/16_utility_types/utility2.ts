// `Pick<T, Keys>` keeps only some properties of T, `Omit<T, Keys>` keeps all
// the others. With `Partial`, they describe every shape an entity takes in an
// app, derived from ONE interface:
//   type NewUser   = Omit<User, "id">;          // what the signup form sends
//   type UserPatch = Partial<NewUser>;          // what the edit form sends
//   type UserChip  = Pick<User, "id" | "name">; // what an avatar chip shows
//
// The three product types below were copied by hand, and they're already out
// of date. Derive them from `Product` instead.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  description: string;
  stock: number;
  createdAt: Date;
}

// `Pick` only accepts keys that exist on `Product`, so a typo is an error.
// `Omit` accepts any key, even one that doesn't exist: double-check its keys.
type NewProduct = Omit<Product, "id" | "createdAt">;

// Built on `NewProduct`, so a patch can never change `id` or `createdAt`.
type ProductPatch = Partial<NewProduct>;

type ProductCard = Pick<Product, "id" | "name" | "priceCents">;

let lastId = 0;

function createProduct(input: NewProduct, now: Date): Product {
  lastId += 1;
  return { ...input, id: `p${lastId}`, createdAt: now };
}

function updateProduct(product: Product, patch: ProductPatch): Product {
  return { ...product, ...patch };
}

function toCard({ id, name, priceCents }: Product): ProductCard {
  return { id, name, priceCents };
}

// Don't change the tests below.

// Next sprint, products get a SKU. Two interfaces with the same name merge
// into one, so this adds `sku` to `Product` above, the way an edit to that
// interface would. Types derived from `Product` pick it up on their own.
interface Product {
  sku: string;
}

const launchDay = new Date("2026-11-01");

const mug = createProduct(
  {
    name: "Mug",
    priceCents: 1200,
    description: "Holds coffee",
    stock: 40,
    sku: "MUG-01",
  },
  launchDay,
);

test("creating a product adds an id and a date", () => {
  assert.equal(mug.id, "p1");
  assert.equal(mug.createdAt, launchDay);
  assert.equal(mug.sku, "MUG-01");
});

test("a patch changes only the given fields", () => {
  const discounted = updateProduct(mug, { priceCents: 900, stock: 35 });
  assert.equal(discounted.priceCents, 900);
  assert.equal(discounted.stock, 35);
  assert.equal(discounted.name, "Mug");
});

test("a card only has what the search page shows", () => {
  assert.deepEqual(toCard(mug), { id: "p1", name: "Mug", priceCents: 1200 });
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<
    Equal<
      NewProduct,
      { name: string; priceCents: number; description: string; stock: number; sku: string }
    >
  >,
  Expect<
    Equal<
      ProductPatch,
      { name?: string; priceCents?: number; description?: string; stock?: number; sku?: string }
    >
  >,
  Expect<Equal<ProductCard, { id: string; name: string; priceCents: number }>>,
];
