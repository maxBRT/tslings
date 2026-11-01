// With `noUncheckedIndexedAccess` (on in tslings and in many strict projects),
// reading an array by index gives `T | undefined`: TypeScript can't know the
// array is long enough, so it makes you handle the missing case instead of
// crashing on it at runtime.
//
// Three honest ways to deal with it:
// - don't index at all: `for (const x of xs)` gives you each `x` as a `T`
// - `xs.at(-1)` reads from the end; check its result for `undefined`
// - destructure with defaults: `const [first = "none"] = xs`
//
// Fix the three functions below; each one is a job for a different tool.

import { test } from "node:test";
import assert from "node:assert/strict";

// Minutes spent on each work session today.
function totalMinutes(sessions: readonly number[]): number {
  let total = 0;
  // TODO: Iterate without indexes.
  for (let i = 0; i < sessions.length; i++) {
    total += sessions[i];
  }
  return total;
}

// A chat's messages, oldest first.
function lastMessage(messages: readonly string[]): string {
  // TODO: Return the newest message, or "No messages yet" if there are none.
  return messages[messages.length - 1];
}

// Command-line arguments, like `process.argv.slice(2)`: a command and an
// environment, both optional. They default to "help" and "dev".
function parseArgs(argv: readonly string[]): string {
  // TODO: Give both values their defaults.
  const command = argv[0];
  const environment = argv[1];
  return `${command.toLowerCase()}:${environment.toLowerCase()}`;
}

// Don't change the tests below.

test("total minutes", () => {
  assert.equal(totalMinutes([25, 50, 15]), 90);
  assert.equal(totalMinutes([]), 0);
});

test("last message", () => {
  assert.equal(lastMessage(["hi", "lunch?", "sure"]), "sure");
  assert.equal(lastMessage([]), "No messages yet");
});

test("arguments with defaults", () => {
  assert.equal(parseArgs(["Deploy", "Staging"]), "deploy:staging");
  assert.equal(parseArgs(["migrate"]), "migrate:dev");
  assert.equal(parseArgs([]), "help:dev");
});
