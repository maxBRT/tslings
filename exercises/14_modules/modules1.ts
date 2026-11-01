// Every TypeScript file that imports or exports something is an ES module. In tslings, Node
// runs your `.ts` files directly: it erases the types one file at a time, without asking
// TypeScript anything. So imports must still make sense once the types are gone:
//
// - Paths are taken literally. Node never guesses a file extension, so write `./money.ts`.
// - An import that only brings in types must say so: `import type { Money } from "./money.ts"`.
//   Node only sees this file and can't know that `Money` is a type. It would look for a
//   `Money` value in money.ts and crash. `import type` lines are erased entirely.
//   (The `verbatimModuleSyntax` option makes TypeScript enforce this.)
//
// Open money.ts, next to this file, to see what it exports.
//
// TODO: Fix the import from money.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { add, Currency, format, Money, money, multiply } from "./money";

interface CartLine {
  readonly product: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

function cartTotal(lines: readonly CartLine[], currency: Currency): Money {
  return lines.reduce(
    (total, line) => add(total, multiply(line.unitPrice, line.quantity)),
    money(0, currency),
  );
}

function receipt(lines: readonly CartLine[], currency: Currency): string {
  return `${lines.length} items, total ${format(cartTotal(lines, currency))}`;
}

// Don't change the tests below.

const cart: CartLine[] = [
  { product: "Notebook", unitPrice: money(450, "EUR"), quantity: 3 },
  { product: "Fountain pen", unitPrice: money(1290, "EUR"), quantity: 1 },
];

test("adds up the cart", () => {
  assert.deepEqual(cartTotal(cart, "EUR"), { cents: 2640, currency: "EUR" });
});

test("an empty cart costs nothing", () => {
  assert.deepEqual(cartTotal([], "GBP"), { cents: 0, currency: "GBP" });
});

test("prints a receipt", () => {
  assert.equal(receipt(cart, "EUR"), "2 items, total €26.40");
});
