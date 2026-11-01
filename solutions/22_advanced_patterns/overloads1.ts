// Overloads give one function several call signatures, for when the return type depends on how
// it's called. You write the signatures first, without a body, then one implementation that
// handles every case. Callers only see the signatures. Node's `readFileSync` is typed this way:
//
//   function readFile(path: string): Buffer;
//   function readFile(path: string, encoding: "utf8"): string;
//   function readFile(path: string, encoding?: "utf8"): Buffer | string { ... }
//
// When every case returns the same type, overloads only get in the way: a caller holding a union
// matches none of them. One signature with a union parameter is simpler.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const settings = new Map([
  ["PORT", "8080"],
  ["HOST", "LocalHost"],
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

// Both overloads returned `number`, so they only added a restriction: a `number | string`
// argument matched neither of them. One signature with a union says everything.
function toCents(amount: number | string): number {
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount);
  return Math.round(value * 100);
}

// Prices come from the API (numbers) or from a CSV import (strings).
function totalCents(prices: readonly (number | string)[]): number {
  let total = 0;
  for (const price of prices) total += toCents(price);
  return total;
}

// Don't change the tests below.

test("getSetting returns the fallback for missing settings", () => {
  assert.equal(getSetting("PORT"), "8080");
  assert.equal(getSetting("TIMEOUT"), undefined);
  assert.equal(getSetting("TIMEOUT", "30"), "30");
});

test("serverUrl", () => {
  assert.equal(serverUrl(), "http://localhost:8080");
});

test("totalCents adds up numbers and strings", () => {
  assert.equal(totalCents([19.99, "5.01", "0.5"]), 2550);
});

const port = getSetting("PORT");
const timeout = getSetting("TIMEOUT", "30");

type _tests = [
  Expect<Equal<typeof port, string | undefined>>,
  Expect<Equal<typeof timeout, string>>,
  Expect<Equal<typeof toCents, (amount: number | string) => number>>,
];
