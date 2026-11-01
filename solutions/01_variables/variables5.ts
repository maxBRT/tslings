import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

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

function statusHistory(heartbeats: boolean[]): string[] {
  // The annotation gives `state` the type we want instead of the inferred `string`.
  // It also caught the "ofline" typo, which JavaScript would have shown as "Connecting...".
  let state: ConnectionState = "connecting";
  const history = [statusText(state)];
  for (const answered of heartbeats) {
    state = answered ? "online" : "offline";
    history.push(statusText(state));
  }
  return history;
}

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
