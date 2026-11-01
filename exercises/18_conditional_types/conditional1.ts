// A conditional type chooses between two types, like a ternary for types:
//
//   type Label<T> = T extends string ? "text" : "other";
//   // Label<"hi"> is "text", Label<42> is "other"
//
// `A extends B` asks "can a value of type A be used as a B?". Libraries use conditional
// types so that one signature adapts to its type arguments.
//
// This event bus types each event's payload. Some events carry no payload, but
// `emit("session/logout")` doesn't compile: the bus wants a second argument. Make
// `EmitArgs<P>` an empty tuple when the payload type is `undefined`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type AppEvents = {
  "session/login": { userId: string };
  "session/logout": undefined;
  "cart/updated": { itemCount: number };
  "app/ready": undefined;
};

// The extra arguments `emit` takes after the event name.
// TODO: No arguments when `P` is `undefined`, one `payload` argument otherwise.
type EmitArgs<P> = [payload: P];

const history: string[] = [];

function emit<E extends keyof AppEvents>(event: E, ...args: EmitArgs<AppEvents[E]>): void {
  const [payload] = args;
  history.push(payload === undefined ? event : `${event} ${JSON.stringify(payload)}`);
}

function startApp(): void {
  emit("app/ready");
}

function signIn(userId: string): void {
  emit("session/login", { userId });
}

function signOut(): void {
  emit("session/logout");
}

// Don't change the tests below.

test("events are emitted with their payload, or without one", () => {
  history.length = 0;
  startApp();
  signIn("u-42");
  emit("cart/updated", { itemCount: 3 });
  signOut();
  assert.deepEqual(history, [
    "app/ready",
    'session/login {"userId":"u-42"}',
    'cart/updated {"itemCount":3}',
    "session/logout",
  ]);
});

type _tests = [
  Expect<Equal<EmitArgs<undefined>, []>>,
  Expect<Equal<EmitArgs<{ userId: string }>, [payload: { userId: string }]>>,
  Expect<Equal<EmitArgs<number>, [payload: number]>>,
];
