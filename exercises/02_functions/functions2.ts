// An inferred return type follows whatever the function returns. So a mistake inside the
// function silently changes its type, and the error shows up somewhere else: in the code
// that uses the function.
//
// A return type annotation, `function f(): string`, turns the type into a contract.
// TypeScript checks the function against it and reports the line that breaks it. That's
// why experienced developers annotate the return type of exported functions, the ones
// other files rely on.
//
// TODO: The error is in `playlistRow`, but the bug isn't. Annotate the return type of
// `formatDuration`, then fix the line TypeScript points at.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Formats a duration for display: "42s", "3m", "1m 35s".
export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  if (seconds === 0) {
    return minutes;
  }
  return `${minutes}m ${seconds}s`;
}

// Code that uses `formatDuration`, maybe in another file: a playlist with the durations
// aligned on the right.
function playlistRow(title: string, totalSeconds: number): string {
  return `${title.padEnd(12)}${formatDuration(totalSeconds).padStart(8)}`;
}

// Don't change the tests below.

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
