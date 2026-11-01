// Distribution is usually what you want, but sometimes a union must be checked as a
// whole. Wrap both sides of `extends` in a one-element tuple: `[T]` is no longer a bare
// type parameter, so the conditional type stops distributing.
//
//   type IsNever<T> = [T] extends [never] ? true : false;
//   // Without the brackets, IsNever<never> would be `never`, not `true`:
//   // distributing over an empty union gives an empty union.
//
// Here is the event bus from conditional1, with a new event. A toast takes a plain
// message or a title and a body. `EmitArgs` splits the `Toast` union into two tuples,
// and now `emit` rejects a perfectly valid toast. Fix `EmitArgs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Toast = string | { title: string; body: string };

type AppEvents = {
  "toast/shown": Toast;
  "session/logout": undefined;
  "cart/updated": { itemCount: number };
};

// TODO: Check `P` as a whole instead of each member of the union.
type EmitArgs<P> = P extends undefined ? [] : [payload: P];

const history: string[] = [];

function emit<E extends keyof AppEvents>(event: E, ...args: EmitArgs<AppEvents[E]>): void {
  const [payload] = args;
  history.push(payload === undefined ? event : `${event} ${JSON.stringify(payload)}`);
}

function showToast(toast: Toast): void {
  emit("toast/shown", toast);
}

// Don't change the tests below.

test("both kinds of toast are emitted", () => {
  history.length = 0;
  showToast("Saved");
  showToast({ title: "Payment failed", body: "Try another card" });
  emit("session/logout");
  assert.deepEqual(history, [
    'toast/shown "Saved"',
    'toast/shown {"title":"Payment failed","body":"Try another card"}',
    "session/logout",
  ]);
});

type _tests = [
  Expect<Equal<EmitArgs<Toast>, [payload: Toast]>>,
  Expect<Equal<EmitArgs<undefined>, []>>,
  Expect<Equal<EmitArgs<"light" | "dark">, [payload: "light" | "dark"]>>,
  // A payload that is only sometimes `undefined` is still a payload: the argument stays.
  Expect<Equal<EmitArgs<string | undefined>, [payload: string | undefined]>>,
];
