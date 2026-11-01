import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// With `: string`, TypeScript reported `return minutes;` itself instead of an error in
// `playlistRow`. Annotate exported functions; inference is fine for small local helpers.
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  if (seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function playlistRow(title: string, totalSeconds: number): string {
  return `${title.padEnd(12)}${formatDuration(totalSeconds).padStart(8)}`;
}

test("seconds only", () => {
  assert.equal(formatDuration(42), "42s");
});

test("whole minutes", () => {
  assert.equal(formatDuration(180), "3m");
});

test("minutes and seconds", () => {
  assert.equal(formatDuration(95), "1m 35s");
});

test("playlist rows line up", () => {
  assert.equal(playlistRow("Intro", 95), "Intro         1m 35s");
  assert.equal(playlistRow("Main theme", 240), "Main theme        4m");
});

type _tests = [Expect<Equal<ReturnType<typeof formatDuration>, string>>];
