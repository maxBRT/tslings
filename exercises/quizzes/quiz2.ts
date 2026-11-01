// This is a quiz for the following chapters:
// - Unions and narrowing
// - Discriminated unions
// - Null handling
//
// An online shop tracks each order through a few states. The payment and
// shipping services send events about orders, which move them along:
//
//   pending --payment_succeeded--> paid --shipped--> shipped
//      |                            |
//      +---------cancelled----------+--> cancelled
//
// Every other move is refused: shipping an unpaid order, paying twice,
// cancelling an order that has already shipped...
//
// Write the three functions below. The types are done; read them first.

import { test } from "node:test";
import assert from "node:assert/strict";

type LineItem = { sku: string; quantity: number; unitCents: number };

type Order =
  | { status: "pending"; id: string; items: readonly LineItem[] }
  | { status: "paid"; id: string; items: readonly LineItem[]; paymentId: string }
  | {
      status: "shipped";
      id: string;
      items: readonly LineItem[];
      paymentId: string;
      trackingNumber: string;
    }
  | { status: "cancelled"; id: string; items: readonly LineItem[]; reason: string };

type OrderEvent =
  | { type: "payment_succeeded"; orderId: string; paymentId: string }
  | { type: "shipped"; orderId: string; trackingNumber: string }
  | { type: "cancelled"; orderId: string; reason: string };

type BatchResult = { orders: Map<string, Order>; rejected: OrderEvent[] };

// TODO: Return the order in its next state, or `undefined` when the event
// isn't allowed in the order's current state. A shipped order keeps its
// `paymentId`. Don't change `order`: build a new object.
// End the `switch` with an exhaustiveness check, so that a new kind of event
// can't be forgotten here.
function applyEvent(order: Order, event: OrderEvent): Order | undefined {}

// TODO: Apply each event, in order, to the order whose `id` is the event's
// `orderId`. Events for orders we don't know, and events that `applyEvent`
// refuses, go to `rejected`. Return a new map: leave `orders` as it is.
function processEvents(
  orders: ReadonlyMap<string, Order>,
  events: readonly OrderEvent[],
): BatchResult {}

// TODO: Customers look up an order by its id, or by the tracking number on
// their parcel. Return `undefined` when nothing matches.
function findOrder(
  orders: ReadonlyMap<string, Order>,
  query: string | { trackingNumber: string },
): Order | undefined {}

// Don't change the tests below.

const items: readonly LineItem[] = [{ sku: "MUG-01", quantity: 2, unitCents: 1200 }];

// Frozen, so that changing them in place throws.
const pending: Order = Object.freeze({ status: "pending", id: "A-1", items });
const paid: Order = Object.freeze({ status: "paid", id: "A-2", items, paymentId: "pay_77" });
const shipped: Order = Object.freeze({
  status: "shipped",
  id: "A-3",
  items,
  paymentId: "pay_78",
  trackingNumber: "1Z999",
});

const pay: OrderEvent = { type: "payment_succeeded", orderId: "A-1", paymentId: "pay_1" };
const ship: OrderEvent = { type: "shipped", orderId: "A-2", trackingNumber: "1Z123" };
const cancel: OrderEvent = { type: "cancelled", orderId: "A-2", reason: "out of stock" };

test("allowed moves", () => {
  assert.deepEqual(applyEvent(pending, pay), {
    status: "paid",
    id: "A-1",
    items,
    paymentId: "pay_1",
  });
  assert.deepEqual(applyEvent(paid, ship), {
    status: "shipped",
    id: "A-2",
    items,
    paymentId: "pay_77",
    trackingNumber: "1Z123",
  });
  assert.deepEqual(applyEvent(paid, cancel), {
    status: "cancelled",
    id: "A-2",
    items,
    reason: "out of stock",
  });
});

test("refused moves", () => {
  assert.equal(applyEvent(pending, ship), undefined);
  assert.equal(applyEvent(paid, pay), undefined);
  assert.equal(applyEvent(shipped, ship), undefined);
  assert.equal(applyEvent(shipped, cancel), undefined);

  const cancelled = applyEvent(pending, cancel);
  assert.equal(cancelled?.status, "cancelled");
  if (cancelled !== undefined) {
    assert.equal(applyEvent(cancelled, pay), undefined);
    assert.equal(applyEvent(cancelled, cancel), undefined);
  }
});

test("processing a batch of events", () => {
  const orders = new Map<string, Order>([
    ["A-1", pending],
    ["A-2", paid],
  ]);
  const events: OrderEvent[] = [
    { type: "payment_succeeded", orderId: "A-1", paymentId: "pay_3" },
    { type: "shipped", orderId: "A-1", trackingNumber: "1Z789" },
    { type: "shipped", orderId: "B-9", trackingNumber: "1Z000" }, // unknown order
    { type: "payment_succeeded", orderId: "A-2", paymentId: "pay_4" }, // paid already
  ];
  const result = processEvents(orders, events);
  assert.deepEqual(result.orders.get("A-1"), {
    status: "shipped",
    id: "A-1",
    items,
    paymentId: "pay_3",
    trackingNumber: "1Z789",
  });
  assert.equal(result.orders.get("A-2"), paid);
  assert.deepEqual(result.rejected, [events[2], events[3]]);
  assert.equal(orders.get("A-1"), pending, "the original map must not change");
});

test("finding an order", () => {
  const orders = new Map<string, Order>([
    ["A-1", pending],
    ["A-3", shipped],
  ]);
  assert.equal(findOrder(orders, "A-1"), pending);
  assert.equal(findOrder(orders, { trackingNumber: "1Z999" }), shipped);
  assert.equal(findOrder(orders, "Z-0"), undefined);
  assert.equal(findOrder(orders, { trackingNumber: "1Z000" }), undefined);
});
