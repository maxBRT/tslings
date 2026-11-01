// An object type lists an object's properties and their types. You can name
// one with an `interface` or with a `type` alias:
//
//   interface Coupon { code: string; percentOff: number }
//   type Coupon = { code: string; percentOff: number };
//
// For plain object shapes both work: teams pick one and stick to it, and
// tslings uses both. Each also has things only it can do. An `interface` can
// build on another one with `extends`, which reports a property that conflicts
// with the parent. A `type` alias can name any type, like a union
// (`type Size = "s" | "m"`) or an intersection, written with `&`: a value of
// type `A & B` has every property of `A` and every property of `B`.
//
// Describe the products of an online shop.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface Product {
  id: string;
  name: string;
  priceCents: number;
}

// `extends` copies every property of `Product`. If `DigitalProduct` redeclared
// one with an incompatible type, TypeScript would report it here.
interface DigitalProduct extends Product {
  downloadUrl: string;
}

// An intersection never reports conflicts: `{ id: string } & { id: number }`
// silently gives `id` the type `never`. Prefer `extends` when both work;
// `&` shines for one-off combinations like this one.
type CartLine = Product & { quantity: number };

function priceTag(product: Product): string {
  return `${product.name}: $${(product.priceCents / 100).toFixed(2)}`;
}

function downloadLink(product: DigitalProduct): string {
  return `<a href="${product.downloadUrl}">${product.name}</a>`;
}

function lineTotalCents(line: CartLine): number {
  return line.priceCents * line.quantity;
}

// Don't change the tests below.

const mug: Product = { id: "p-1", name: "Mug", priceCents: 1250 };
const ebook: DigitalProduct = {
  id: "p-2",
  name: "Strict Mode Cookbook",
  priceCents: 1999,
  downloadUrl: "https://shop.example/dl/p-2",
};

test("price tag", () => {
  assert.equal(priceTag(mug), "Mug: $12.50");
  assert.equal(priceTag(ebook), "Strict Mode Cookbook: $19.99");
});

test("download link", () => {
  assert.equal(
    downloadLink(ebook),
    `<a href="https://shop.example/dl/p-2">Strict Mode Cookbook</a>`,
  );
});

test("cart line total", () => {
  assert.equal(lineTotalCents({ ...mug, quantity: 3 }), 3750);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<Product, { id: string; name: string; priceCents: number }>>,
  Expect<
    Equal<DigitalProduct, { id: string; name: string; priceCents: number; downloadUrl: string }>
  >,
  Expect<Equal<CartLine, Product & { quantity: number }>>,
];
