// Overloads give one function several call signatures, for when the return type depends on how
// it's called. You write the signatures first, without a body, then one implementation that
// handles every case. Callers only see the signatures. Node's `readFileSync` is typed roughly
// like this (simplified):
//
//   function readFileSync(path: string): Buffer;
//   function readFileSync(path: string, encoding: "utf8"): string;
//   function readFileSync(path: string, encoding?: "utf8"): Buffer | string { ... }
//
// When every case returns the same type, overloads only get in the way: a caller holding a union
// matches none of them. One signature with a union parameter is simpler.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const settings = new Map([
  ["PORT", "8080"],
  ["HOST", "LocalHost"],
  ["TIMEOUT", "2.5s"],
]);

// The implementation signature is not visible to callers. It must be compatible with every
// overload, and TypeScript checks the body against it (not against each overload).
function getSetting(name: string): string | undefined;
function getSetting(name: string, fallback: string): string;
function getSetting(name: string, fallback?: string): string | undefined {
  return settings.get(name) ?? fallback;
}

function serverUrl(): string {
  const host = getSetting("HOST", "0.0.0.0");
  const port = getSetting("PORT", "3000");
  return `http://${host.toLowerCase()}:${port}`;
}

// A duration is a number of milliseconds in the code, and a string of seconds like "2.5s" in
// the settings.
// Both overloads returned `number`, so they only added a restriction: a `number | string`
// argument, like the one in `requestTimeoutMs`, matched neither of them.
function toMilliseconds(duration: number | string): number {
  return typeof duration === "number" ? duration : Math.round(Number.parseFloat(duration) * 1000);
}

// The timeout from the settings, or 30 seconds when there is none.
function requestTimeoutMs(): number {
  return toMilliseconds(getSetting("TIMEOUT") ?? 30_000);
}

// Don't change the tests below.

test("getSetting returns the fallback for missing settings", () => {
  assert.equal(getSetting("PORT"), "8080");
  assert.equal(getSetting("RETRIES"), undefined);
  assert.equal(getSetting("RETRIES", "3"), "3");
});

test("serverUrl", () => {
  assert.equal(serverUrl(), "http://localhost:8080");
});

test("durations in milliseconds or in seconds", () => {
  assert.equal(toMilliseconds(250), 250);
  assert.equal(toMilliseconds("0.5s"), 500);
  assert.equal(requestTimeoutMs(), 2500);
});

const port = getSetting("PORT");
const retries = getSetting("RETRIES", "3");

type _tests = [
  Expect<Equal<typeof port, string | undefined>>,
  Expect<Equal<typeof retries, string>>,
  Expect<Equal<typeof toMilliseconds, (duration: number | string) => number>>,
];
