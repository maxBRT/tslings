// TypeScript can't guess what a function will be called with, so every parameter needs a
// type annotation: `function greet(name: string)`. Without one, the parameter would be
// `any`, a type that turns checking off, and tslings' `strict` setting makes that an error.
//
// Return types are different: TypeScript infers them from the `return` statements, so you
// can leave them out here. (The next exercise shows when to write them anyway.)
//
// TODO: Annotate the parameters of `orderLine` and `itemCount`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function orderLine(product, quantity, giftWrapped) {
  const name = product.trim();
  const line = quantity > 1 ? `${quantity} x ${name}` : name;
  return giftWrapped ? `${line} (gift wrapped)` : line;
}

// Arrow functions annotate their parameters the same way.
const itemCount = (count) => (count === 1 ? "1 item" : `${count} items`);

// Don't change the tests below.

test("a single item", () => {
  assert.equal(orderLine("Mug ", 1, false), "Mug");
});

test("several gift-wrapped items", () => {
  assert.equal(orderLine("Notebook", 3, true), "3 x Notebook (gift wrapped)");
});

test("counts items", () => {
  assert.equal(itemCount(1), "1 item");
  assert.equal(itemCount(4), "4 items");
});

type _tests = [
  Expect<Equal<Parameters<typeof orderLine>, [string, number, boolean]>>,
  Expect<Equal<typeof itemCount, (count: number) => string>>,
];
