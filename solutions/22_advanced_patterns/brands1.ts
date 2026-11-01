// Structural typing has a blind spot: a user ID and an order ID are both strings, so TypeScript
// happily lets you pass one where the other is expected. A *branded* type closes the gap by
// adding a property that no plain string has:
//
//   type UserId = string & { readonly __brand: "UserId" };
//
// The brand only exists in the type system: at runtime the value is still a plain string. But a
// plain string no longer fits, so the only way to get a `UserId` is through a function that
// checks the value first. That function uses a type guard (`raw is UserId`), never `as`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// The `__brand` property never exists at runtime; nobody reads it. Some codebases use a
// `declare const brand: unique symbol` key instead, so the brand can't even be spelled outside
// this module.
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

// The type guard is the one place that decides what counts as a valid ID.
function isUserId(raw: string): raw is UserId {
  return /^usr_[a-z0-9]+$/.test(raw);
}

function isOrderId(raw: string): raw is OrderId {
  return /^ord_[0-9]+$/.test(raw);
}

function parseUserId(raw: string): UserId {
  if (!isUserId(raw)) throw new Error(`Invalid user ID: ${raw}`);
  return raw; // narrowed to `UserId` by the guard
}

function parseOrderId(raw: string): OrderId {
  if (!isOrderId(raw)) throw new Error(`Invalid order ID: ${raw}`);
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
  // The arguments were swapped. With plain strings this compiled and failed at runtime with
  // "No order usr_ada"; with brands it is a type error.
  cancelOrder(orderId, userId);
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
