// This quiz covers chapters 01 to 06: variables, functions, literal types,
// arrays and tuples, objects, and collections.
//
// A small warehouse app tracks its stock. Each item is described once, in a
// catalog. How many units of each item sit on the shelves lives in a Map from
// SKU (the item's code) to quantity, since SKUs come from data. Deliveries
// arrive as lists of lines, each line a SKU and a quantity.
//
// Write the two types, then the three functions. The tests at the bottom show
// what each function should do.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Category = "tools" | "garden" | "kitchen";

// TODO: An item has a `sku` that never changes (a string), a `name` (a string),
// a `category`, and a `priceCents` (a number). It may also be `discontinued`
// (a boolean), but most items don't have that property at all.
interface Item {}

// TODO: One line of a delivery note: a labelled tuple of a SKU and a quantity.
type DeliveryLine = unknown;

// TODO: Add each line's quantity to `stock` (a SKU that isn't in stock yet
// starts from 0), and return the total number of units received.
function receive(stock: Map<string, number>, delivery: readonly DeliveryLine[]): number {}

// TODO: The names of the items that are still sold (not discontinued) and have
// fewer than `threshold` units in stock, in catalog order. An item missing
// from `stock` has 0 units.
function lowStock(
  catalog: readonly Item[],
  stock: ReadonlyMap<string, number>,
  threshold: number,
): string[] {}

// TODO: The value of the stock (price times quantity, in cents) per category.
// Every category must appear, with 0 when nothing of it is in stock.
function stockValue(
  catalog: readonly Item[],
  stock: ReadonlyMap<string, number>,
): Record<Category, number> {}

// Don't change the tests below.

const CATALOG: readonly Item[] = [
  { sku: "HAM-01", name: "Claw hammer", category: "tools", priceCents: 1499 },
  { sku: "SAW-02", name: "Hand saw", category: "tools", priceCents: 2299, discontinued: true },
  { sku: "HOS-10", name: "Garden hose", category: "garden", priceCents: 3499 },
  { sku: "PAN-07", name: "Frying pan", category: "kitchen", priceCents: 2999 },
];

function currentStock(): Map<string, number> {
  return new Map([
    ["HAM-01", 12],
    ["SAW-02", 1],
    ["PAN-07", 3],
  ]);
}

test("receive a delivery", () => {
  const stock = currentStock();
  const received = receive(stock, [
    ["HAM-01", 8],
    ["HOS-10", 20],
    ["HOS-10", 5],
  ]);
  assert.equal(received, 33);
  assert.equal(stock.get("HAM-01"), 20);
  assert.equal(stock.get("HOS-10"), 25);
  assert.equal(stock.get("PAN-07"), 3);
});

test("an empty delivery changes nothing", () => {
  const stock = currentStock();
  assert.equal(receive(stock, []), 0);
  assert.deepEqual(stock, currentStock());
});

test("low stock", () => {
  // The hand saw has a single unit left, but it's discontinued.
  assert.deepEqual(lowStock(CATALOG, currentStock(), 5), ["Garden hose", "Frying pan"]);
  assert.deepEqual(lowStock(CATALOG, currentStock(), 1), ["Garden hose"]);
  assert.deepEqual(lowStock(CATALOG, currentStock(), 0), []);
});

test("stock value per category", () => {
  assert.deepEqual(stockValue(CATALOG, currentStock()), {
    tools: 12 * 1499 + 1 * 2299,
    garden: 0,
    kitchen: 3 * 2999,
  });
  assert.deepEqual(stockValue([], new Map()), { tools: 0, garden: 0, kitchen: 0 });
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<
    Equal<
      Item,
      {
        readonly sku: string;
        name: string;
        category: Category;
        priceCents: number;
        discontinued?: boolean;
      }
    >
  >,
  Expect<Equal<DeliveryLine, [string, number]>>,
  Expect<Equal<Category, "tools" | "garden" | "kitchen">>,
];
