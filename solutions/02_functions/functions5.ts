import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// `void`: listeners may return anything, `emit` promises not to use it.
// `unknown` would accept them too, but it reads as "the result matters, check it first".
type Listener = (event: string) => void;

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
