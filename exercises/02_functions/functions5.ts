// `void` as a return type means "whoever calls this ignores what it returns". It's the
// usual return type of callbacks such as event listeners. Since the result is ignored,
// TypeScript accepts a callback that does return something where a `void` function is
// expected, like `(line) => lines.push(line)`, which returns the array's new length.
//
// `undefined` as a return type is stricter: the function really must return `undefined`.
// That's rarely what a callback type should say.
//
// TODO: Fix the `Listener` type so that `emit` accepts any listener, whatever it returns.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Listener = (event: string) => undefined;

// Calls every listener with the event. What the listeners return is never used.
function emit(event: string, listeners: Listener[]): void {
  for (const listener of listeners) {
    listener(event);
  }
}

const auditLog: string[] = [];
let lastEvent = "";

const recordInAuditLog: Listener = (event) => auditLog.push(event);
const rememberLastEvent: Listener = (event) => {
  lastEvent = event;
};

// Don't change the tests below.

test("every listener receives the event", () => {
  emit("order.created", [recordInAuditLog, rememberLastEvent]);
  emit("order.paid", [recordInAuditLog, rememberLastEvent]);
  assert.deepEqual(auditLog, ["order.created", "order.paid"]);
  assert.equal(lastEvent, "order.paid");
});

test("inline listeners can be one-liners", () => {
  const received: string[] = [];
  emit("order.shipped", [(event) => received.push(event)]);
  assert.deepEqual(received, ["order.shipped"]);
});

type _tests = [Expect<Equal<ReturnType<Listener>, void>>];
