// This quiz tests:
// - Discriminated unions, generic constraints and `Extract`
// - Mapped types with key remapping, and template literal types
// - Async iteration with `for await`
// - Type-level tests
//
// An event-sourced cart doesn't store its current state. It stores what happened, as a list of
// events, and gets the state back by replaying them in order. The same events can feed other
// views, like the statistics at the end.

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

// `Extract` keeps the members of the union that fit `{ type: Type }`. It checks each member of
// `CartEvent` on its own, so `EventOf<"itemAdded" | "checkedOut">` gives both events.
type EventOf<Type extends EventType> = Extract<CartEvent, { type: Type }>;

// One function per event type. Each one receives exactly its own kind of event.
type Reducers = { [Type in EventType]: (cart: Cart, event: EventOf<Type>) => Cart };

// Because `Reducers` maps every event type, forgetting one is a compile error, like a missing
// `case` in an exhaustive `switch`. Each handler's `event` parameter is typed from the context.
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
  couponApplied: (cart, event) => ({ ...cart, percentOff: event.percentOff }),
  checkedOut: (cart) => ({ ...cart, checkedOut: true }),
};

// Calls the reducer that matches the event. Because `Type` is generic, TypeScript can tell that
// `reducers[event.type]` and `event` belong together.
function applyEvent<Type extends EventType>(cart: Cart, event: EventOf<Type>): Cart {
  if (cart.checkedOut) throw new Error(`Cart is checked out, can't apply ${event.type}`);
  return reducers[event.type](cart, event);
}

// `for await` takes the events one at a time as they arrive, so a long history never has to
// sit in memory all at once. If `applyEvent` throws, the returned promise rejects.
async function replay(events: AsyncIterable<CartEvent>): Promise<Cart> {
  let cart = emptyCart;
  for await (const event of events) cart = applyEvent(cart, event);
  return cart;
}

function cartTotal(cart: Cart): Cents {
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return Math.round(subtotal * (1 - cart.percentOff / 100));
}

// Iterating over `Event["type"]` and renaming each key with `as` keeps the counters in sync with
// the union: add an event type and `countEvents` must count it, or it won't compile.
type EventCounts<Event extends { type: string }> = {
  [Type in Event["type"] as `${Type}Count`]: number;
};

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

// Pretends to read the events one by one from a database.
async function* stream(events: readonly CartEvent[]): AsyncGenerator<CartEvent> {
  for (const event of events) {
    await new Promise((resolve) => setTimeout(resolve, 1));
    yield event;
  }
}

test("replaying the history rebuilds the cart", async () => {
  const cart = await replay(stream(history));
  assert.deepEqual(cart, {
    items: [{ sku: "tee", unitPrice: 1500, quantity: 2 }],
    percentOff: 20,
    checkedOut: true,
  });
  assert.equal(cartTotal(cart), 2400);
});

test("a checked-out cart rejects new events", async () => {
  const events: CartEvent[] = [...history, { type: "itemRemoved", sku: "tee" }];
  await assert.rejects(replay(stream(events)), /Cart is checked out, can't apply itemRemoved/);
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

type _tests = [
  Expect<Equal<EventOf<"itemRemoved">, { type: "itemRemoved"; sku: string }>>,
  Expect<Equal<EventOf<"checkedOut" | "couponApplied">["type"], "checkedOut" | "couponApplied">>,
  Expect<Equal<keyof EventCounts<CartEvent>, `${EventType}Count`>>,
  Expect<Equal<EventCounts<EmailEvent>, { sentCount: number; bouncedCount: number }>>,
];
