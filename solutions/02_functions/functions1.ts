import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// The return type (`string`) is inferred from the `return` statement.
function orderLine(product: string, quantity: number, giftWrapped: boolean) {
  const name = product.trim();
  const line = quantity > 1 ? `${quantity} x ${name}` : name;
  return giftWrapped ? `${line} (gift wrapped)` : line;
}

const itemCount = (count: number) => (count === 1 ? "1 item" : `${count} items`);

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
