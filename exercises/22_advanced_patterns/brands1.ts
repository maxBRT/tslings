// Structural typing has a blind spot: a user ID and an order ID are both strings, so TypeScript
// happily lets you pass one where the other is expected. A *branded* type closes the gap by
// adding a property that no plain string has:
//
//   type UserId = string & { readonly __brand: "UserId" };
//
// The brand only exists in the type system: at runtime the value is still a plain string. But a
// plain string no longer fits, so the only way to get a `UserId` is through a function that
// checks the value first. That function uses a type guard (`raw is UserId`), never `as`.
//
// TODO: Brand `UserId` and `OrderId`. Then make the parse functions compile again, and fix the
// bug that the brands reveal.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type UserId = string;
type OrderId = string;

function parseUserId(raw: string): UserId {
  if (!/^usr_[a-z0-9]+$/.test(raw)) throw new Error(`Invalid user ID: ${raw}`);
  return raw;
}

function parseOrderId(raw: string): OrderId {
  if (!/^ord_[0-9]+$/.test(raw)) throw new Error(`Invalid order ID: ${raw}`);
  return raw;
}

type Order = { readonly id: OrderId; readonly customer: UserId; status: "open" | "cancelled" };

const orders = new Map<OrderId, Order>();

function cancelOrder(orderId: OrderId, requestedBy: UserId): void {
  const order = orders.get(orderId);
  if (order === undefined) throw new Error(`No order ${orderId}`);
  if (order.customer !== requestedBy) throw new Error("Only the customer can cancel this order");
  order.status = "cancelled";
}

// The HTTP layer calls this with the request body.
function handleCancelRequest(body: { orderId: string; userId: string }): void {
  const userId = parseUserId(body.userId);
  const orderId = parseOrderId(body.orderId);
  cancelOrder(userId, orderId);
}

// Don't change the tests below.

test("parse functions accept valid IDs and reject the rest", () => {
  assert.equal(parseUserId("usr_ada"), "usr_ada");
  assert.equal(parseOrderId("ord_42"), "ord_42");
  assert.throws(() => parseUserId("ord_42"), /Invalid user ID/);
  assert.throws(() => parseOrderId("42"), /Invalid order ID/);
});

test("a customer can cancel their own order", () => {
  const id = parseOrderId("ord_1");
  orders.set(id, { id, customer: parseUserId("usr_ada"), status: "open" });
  handleCancelRequest({ orderId: "ord_1", userId: "usr_ada" });
  assert.equal(orders.get(id)?.status, "cancelled");
});

// `Fits<A, B>` is `true` when a value of type A can be used where a B is expected.
type Fits<A, B> = [A] extends [B] ? true : false;

type _tests = [
  // A string, even one that looks right, only becomes an ID by going through a parse function.
  Expect<Equal<Fits<string, UserId>, false>>,
  Expect<Equal<Fits<"usr_ada", UserId>, false>>,
  Expect<Equal<Fits<string, OrderId>, false>>,
  // The two kinds of ID can't be swapped.
  Expect<Equal<Fits<UserId, OrderId>, false>>,
  Expect<Equal<Fits<OrderId, UserId>, false>>,
  // An ID is still a string: string methods and template literals work on it.
  Expect<Equal<Fits<UserId, string>, true>>,
];
