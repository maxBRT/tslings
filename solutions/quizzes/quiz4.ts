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

// Without these, a mistake in `EventOf` would only show up as a confusing error in a reducer.
type _eventOfTests = [
  Expect<Equal<EventOf<"itemRemoved">, { type: "itemRemoved"; sku: string }>>,
  Expect<Equal<EventOf<"checkedOut" | "couponApplied">["type"], "checkedOut" | "couponApplied">>,
];

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

// Narrowing does the work, as in chapter 10: after `"type" in value`, `value.type` can be read
// (as `unknown`) and compared. Each `"field" in value` then makes the next field readable. The
// `default` branch rejects event types this version of the app doesn't know.
function isCartEvent(value: unknown): value is CartEvent {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  switch (value.type) {
    case "itemAdded":
      return (
        "sku" in value &&
        typeof value.sku === "string" &&
        "unitPrice" in value &&
        typeof value.unitPrice === "number" &&
        "quantity" in value &&
        typeof value.quantity === "number"
      );
    case "itemRemoved":
      return "sku" in value && typeof value.sku === "string";
    case "couponApplied":
      return (
        "code" in value &&
        typeof value.code === "string" &&
        "percentOff" in value &&
        typeof value.percentOff === "number"
      );
    case "checkedOut":
      return true;
    default:
      return false;
  }
}

type ReplayResult = { readonly cart: Cart; readonly skipped: readonly string[] };

// `for await` takes the lines one at a time as they arrive, so a long log never has to sit in
// memory all at once. Only `JSON.parse` goes in the `try`: wrap the whole loop body, and the
// error from `applyEvent` would be swallowed too, so a checked-out cart would accept anything.
async function replay(lines: AsyncIterable<string>): Promise<ReplayResult> {
  let cart = emptyCart;
  const skipped: string[] = [];
  for await (const line of lines) {
    let data: unknown;
    try {
      data = JSON.parse(line);
    } catch {
      skipped.push(line);
      continue;
    }
    if (isCartEvent(data)) cart = applyEvent(cart, data);
    else skipped.push(line);
  }
  return { cart, skipped };
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
