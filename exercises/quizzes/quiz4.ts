// This quiz tests:
// - Discriminated unions, generic constraints and `Extract`
// - Type-level tests
// - Parsing `unknown` data with a type guard, and catching only the errors you expect
// - Async iteration with `for await`
// - Mapped types with key remapping, and template literal types
//
// An event-sourced cart doesn't store its current state. It stores what happened, as a log
// with one JSON event per line, and gets the state back by replaying the events in order. The
// same events can feed other views, like the statistics at the end.
//
// Complete the six TODOs, from top to bottom. The tests at the bottom check both the behaviour
// and the types.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Cents = number;

type CartEvent =
  | { type: "itemAdded"; sku: string; unitPrice: Cents; quantity: number }
  | { type: "itemRemoved"; sku: string }
  | { type: "couponApplied"; code: string; percentOff: number }
  | { type: "checkedOut" };

type EventType = CartEvent["type"];

type LineItem = { readonly sku: string; readonly unitPrice: Cents; readonly quantity: number };

type Cart = {
  readonly items: readonly LineItem[];
  readonly percentOff: number;
  readonly checkedOut: boolean;
};

const emptyCart: Cart = { items: [], percentOff: 0, checkedOut: false };

// TODO (1): The member of `CartEvent` whose `type` is `Type`.
type EventOf<Type extends EventType> = unknown;

// TODO (2): Pin `EventOf` down with two type tests, written like the ones at the end of the
// file. `EventOf<"itemRemoved">` is `{ type: "itemRemoved"; sku: string }`. Given two event
// types, it gives both events: the `type` of `EventOf<"checkedOut" | "couponApplied">` is
// `"checkedOut" | "couponApplied"`.
type _eventOfTests = [];

// One function per event type. Each one receives exactly its own kind of event.
type Reducers = { [Type in EventType]: (cart: Cart, event: EventOf<Type>) => Cart };

// TODO (3): Handle the two missing events. A coupon replaces any previous one. Checking out
// marks the cart as checked out.
const reducers: Reducers = {
  itemAdded: (cart, event) => {
    const existing = cart.items.find((item) => item.sku === event.sku);
    const quantity = (existing?.quantity ?? 0) + event.quantity;
    const others = cart.items.filter((item) => item.sku !== event.sku);
    const line = { sku: event.sku, unitPrice: event.unitPrice, quantity };
    return { ...cart, items: [...others, line] };
  },
  itemRemoved: (cart, event) => ({
    ...cart,
    items: cart.items.filter((item) => item.sku !== event.sku),
  }),
};

// Calls the reducer that matches the event. Because `Type` is generic, TypeScript can tell that
// `reducers[event.type]` and `event` belong together.
function applyEvent<Type extends EventType>(cart: Cart, event: EventOf<Type>): Cart {
  if (cart.checkedOut) throw new Error(`Cart is checked out, can't apply ${event.type}`);
  return reducers[event.type](cart, event);
}

// TODO (4): Is this value, parsed from one line of the log, one of the four events? Every field
// of that event must be there, with the right type.
function isCartEvent(value: unknown): value is CartEvent {
  return false;
}

type ReplayResult = { readonly cart: Cart; readonly skipped: readonly string[] };

// TODO (5): Read the log line by line, and apply each event in order, starting from `emptyCart`.
// Skip the lines that aren't valid JSON or aren't a `CartEvent`, and return them, unchanged, in
// `skipped`. Any other error, like an event sent to a checked-out cart, still rejects.
async function replay(lines: AsyncIterable<string>): Promise<ReplayResult> {
  return { cart: emptyCart, skipped: [] };
}

function cartTotal(cart: Cart): Cents {
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return Math.round(subtotal * (1 - cart.percentOff / 100));
}

// TODO (6): One counter per event type, named after it: `{ itemAddedCount: number; ... }`.
// It works for any union of events with a string `type`, not just `CartEvent`.
type EventCounts<Event extends { type: string }> = {};

function countEvents(events: readonly CartEvent[]): EventCounts<CartEvent> {
  const counts: EventCounts<CartEvent> = {
    itemAddedCount: 0,
    itemRemovedCount: 0,
    couponAppliedCount: 0,
    checkedOutCount: 0,
  };
  for (const event of events) counts[`${event.type}Count`]++;
  return counts;
}

// Don't change the tests below.

const history: CartEvent[] = [
  { type: "itemAdded", sku: "tee", unitPrice: 1500, quantity: 1 },
  { type: "itemAdded", sku: "mug", unitPrice: 900, quantity: 2 },
  { type: "couponApplied", code: "WELCOME5", percentOff: 5 },
  { type: "itemAdded", sku: "tee", unitPrice: 1500, quantity: 1 },
  { type: "itemRemoved", sku: "mug" },
  { type: "couponApplied", code: "AUTUMN20", percentOff: 20 },
  { type: "checkedOut" },
];

// Pretends to read the log one line at a time from a file.
async function* stream(lines: readonly string[]): AsyncGenerator<string> {
  for (const line of lines) {
    await new Promise((resolve) => setTimeout(resolve, 1));
    yield line;
  }
}

function toLog(events: readonly CartEvent[]): string[] {
  return events.map((event) => JSON.stringify(event));
}

test("replaying the history rebuilds the cart", async () => {
  const { cart, skipped } = await replay(stream(toLog(history)));
  assert.deepEqual(cart, {
    items: [{ sku: "tee", unitPrice: 1500, quantity: 2 }],
    percentOff: 20,
    checkedOut: true,
  });
  assert.deepEqual(skipped, []);
  assert.equal(cartTotal(cart), 2400);
});

test("checks every field of every event", () => {
  assert.equal(isCartEvent({ type: "itemAdded", sku: "tee", unitPrice: 1500, quantity: 1 }), true);
  assert.equal(isCartEvent({ type: "itemRemoved", sku: "tee" }), true);
  assert.equal(isCartEvent({ type: "couponApplied", code: "WELCOME5", percentOff: 5 }), true);
  assert.equal(isCartEvent({ type: "checkedOut" }), true);
  assert.equal(isCartEvent({ type: "itemAdded", sku: "tee", unitPrice: 1500 }), false);
  assert.equal(isCartEvent({ type: "itemRemoved", sku: 42 }), false);
  assert.equal(isCartEvent({ type: "couponApplied", percentOff: 5 }), false);
  assert.equal(isCartEvent({ type: "refundIssued", sku: "tee" }), false);
  assert.equal(isCartEvent({ sku: "tee" }), false);
  assert.equal(isCartEvent("checkedOut"), false);
  assert.equal(isCartEvent(null), false);
});

test("lines that aren't cart events are skipped", async () => {
  const lines = [
    '{"type":"itemAdded","sku":"tee","unitPrice":1500,"quantity":1}',
    '{"type":"itemAdded","sku":"mug","unitPrice":"900","quantity":2}',
    '{"type":"itemRemoved","sku":',
    '{"type":"refundIssued","sku":"tee"}',
    "null",
    '{"type":"checkedOut"}',
  ];
  const { cart, skipped } = await replay(stream(lines));
  assert.deepEqual(cart, {
    items: [{ sku: "tee", unitPrice: 1500, quantity: 1 }],
    percentOff: 0,
    checkedOut: true,
  });
  assert.deepEqual(skipped, lines.slice(1, 5));
});

test("a checked-out cart rejects new events", async () => {
  const events: CartEvent[] = [...history, { type: "itemRemoved", sku: "tee" }];
  await assert.rejects(
    replay(stream(toLog(events))),
    /Cart is checked out, can't apply itemRemoved/,
  );
});

test("counts every kind of event", () => {
  assert.deepEqual(countEvents(history), {
    itemAddedCount: 3,
    itemRemovedCount: 1,
    couponAppliedCount: 2,
    checkedOutCount: 1,
  });
});

type EmailEvent = { type: "sent"; to: string } | { type: "bounced"; reason: string };

// Your two type tests of TODO (2).
type _eventOfCount = Expect<Equal<_eventOfTests["length"], 2>>;

type _tests = [
  Expect<Equal<keyof EventCounts<CartEvent>, `${EventType}Count`>>,
  Expect<Equal<EventCounts<EmailEvent>, { sentCount: number; bouncedCount: number }>>,
];
