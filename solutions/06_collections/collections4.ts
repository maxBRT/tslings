// `Object.groupBy(items, fn)` (ES2024) groups an array into an object of
// arrays, keyed by what `fn` returns. Its type is `Partial<Record<K, T[]>>`:
// `Partial` makes every key optional, because a group with no items isn't in
// the result at all. TypeScript makes you handle those missing groups.
//
// Object keys can only be strings (or symbols): numbers become "1", `true`
// becomes "true". `Map.groupBy` groups into a `Map<K, T[]>` instead, whose keys
// keep their type, so you can group by a boolean, a number or an object.
//
// An online shop reports on its orders. Fix both functions.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Status = "pending" | "shipped" | "delivered";

interface Order {
  readonly id: string;
  readonly status: Status;
  readonly totalCents: number;
}

function countByStatus(orders: readonly Order[]): Record<Status, number> {
  const groups = Object.groupBy(orders, (order) => order.status);
  // `groups.shipped` is `Order[] | undefined`: no shipped orders, no key.
  return {
    pending: groups.pending?.length ?? 0,
    shipped: groups.shipped?.length ?? 0,
    delivered: groups.delivered?.length ?? 0,
  };
}

// With `Object.groupBy`, the keys would have been the strings "true" and "false".
function groupBySize(orders: readonly Order[]): Map<boolean, Order[]> {
  return Map.groupBy(orders, (order) => order.totalCents >= 100_00);
}

function splitBySize(orders: readonly Order[]): [large: Order[], small: Order[]] {
  const groups = groupBySize(orders);
  // `get` may return `undefined` when every order lands in the same group.
  return [groups.get(true) ?? [], groups.get(false) ?? []];
}

// Don't change the tests below.

const orders: Order[] = [
  { id: "A-1", status: "pending", totalCents: 25_00 },
  { id: "A-2", status: "delivered", totalCents: 180_00 },
  { id: "A-3", status: "pending", totalCents: 100_00 },
  { id: "A-4", status: "delivered", totalCents: 9_99 },
];

test("count orders by status", () => {
  assert.deepEqual(countByStatus(orders), { pending: 2, shipped: 0, delivered: 2 });
  assert.deepEqual(countByStatus([]), { pending: 0, shipped: 0, delivered: 0 });
  const shipped: Order = { id: "A-5", status: "shipped", totalCents: 42_00 };
  assert.deepEqual(countByStatus([shipped]), { pending: 0, shipped: 1, delivered: 0 });
});

test("split orders by size", () => {
  const [large, small] = splitBySize(orders);
  assert.deepEqual(
    large.map((order) => order.id),
    ["A-2", "A-3"],
  );
  assert.deepEqual(
    small.map((order) => order.id),
    ["A-1", "A-4"],
  );
});

test("no large orders", () => {
  const [large, small] = splitBySize(orders.slice(0, 1));
  assert.deepEqual(large, []);
  assert.equal(small.length, 1);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [Expect<Equal<ReturnType<typeof groupBySize>, Map<boolean, Order[]>>>];
