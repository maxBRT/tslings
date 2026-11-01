// A `let` widens string literals to `string`, which is usually what you want. But some
// variables move between a few known values, like a connection that is "connecting",
// then "online", then "offline". For those, annotate the `let` with the type that lists
// its possible values. TypeScript then rejects every other string, typos included.
//
// TODO: Annotate `state` with the `ConnectionState` type, then fix what TypeScript finds.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// One of these three strings. (Chapter 03 covers types like this one.)
type ConnectionState = "connecting" | "online" | "offline";

function statusText(state: ConnectionState): string {
  if (state === "online") {
    return "Online";
  }
  if (state === "offline") {
    return "Offline, retrying...";
  }
  return "Connecting...";
}

// Replays a connection's history. Each heartbeat is `true` when the server answered,
// `false` when it timed out.
function statusHistory(heartbeats: boolean[]): string[] {
  let state = "connecting";
  const history = [statusText(state)];
  for (const answered of heartbeats) {
    state = answered ? "online" : "ofline";
    history.push(statusText(state));
  }
  return history;
}

// Don't change the tests below.

test("starts by connecting", () => {
  assert.deepEqual(statusHistory([]), ["Connecting..."]);
});

test("follows the heartbeats", () => {
  assert.deepEqual(statusHistory([true, false, true]), [
    "Connecting...",
    "Online",
    "Offline, retrying...",
    "Online",
  ]);
});

type _tests = [Expect<Equal<Parameters<typeof statusText>, [ConnectionState]>>];
