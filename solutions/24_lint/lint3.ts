// A last cleanup, the way a code review would go. Each lint here points at a real problem.
//
// `prefer-const` flags a `let` that is never reassigned. `const` tells the reader the value
// won't change, and TypeScript gives it a narrower type: `let size = "M"` is a `string`, while
// `const size = "M"` is the literal type `"M"`, which fits a `"S" | "M" | "L"` union.
//
// `no-non-null-assertion` flags `value!`, which tells TypeScript "this isn't undefined" without
// checking. When you're wrong, nothing fails at that line: a `NaN` or a crash shows up somewhere
// else, later. Handle the `undefined` case where it happens instead.

import { test } from "node:test";
import assert from "node:assert/strict";

type Size = "S" | "M" | "L";
type LineItem = { sku: string; size: Size; quantity: number };

const prices = new Map([
  ["tee", 1500],
  ["hoodie", 4500],
]);
const sizeSurcharge: Record<Size, number> = { S: 0, M: 0, L: 200 };

function defaultItem(sku: string): LineItem {
  // `const` keeps the literal type `"M"`. (The shorter fix is to inline it: `size: "M"`.)
  const size = "M";
  return { sku, size, quantity: 1 };
}

function lineTotal(item: LineItem): number {
  const unitPrice = prices.get(item.sku);
  // With `!`, an unknown SKU gave `undefined + 0`, so the cart total became NaN.
  if (unitPrice === undefined) throw new Error(`Unknown product: ${item.sku}`);
  return (unitPrice + sizeSurcharge[item.size]) * item.quantity;
}

function cartTotal(items: readonly LineItem[]): number {
  // `total` really is reassigned, so it stays `let`. `item` isn't: `for (const ... of ...)`
  // gets a fresh binding each time around the loop.
  let total = 0;
  for (const item of items) total += lineTotal(item);
  return total;
}

// Don't change the tests below.

test("new items are medium, one of them", () => {
  assert.deepEqual(defaultItem("tee"), { sku: "tee", size: "M", quantity: 1 });
});

test("large sizes cost a bit more", () => {
  assert.equal(lineTotal({ sku: "tee", size: "L", quantity: 2 }), 3400);
  assert.equal(cartTotal([defaultItem("tee"), defaultItem("hoodie")]), 6000);
});

test("an unknown product is an error, not NaN", () => {
  assert.throws(() => lineTotal(defaultItem("socks")), /Unknown product: socks/);
});
