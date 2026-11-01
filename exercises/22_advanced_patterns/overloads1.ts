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
//
// TODO: Add two overloads to `getSetting`: without a fallback it returns `string | undefined`,
// with a fallback it returns `string`.
// TODO: `toCents` has overloads it doesn't need. Replace them with a single signature.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const settings = new Map([
  ["PORT", "8080"],
  ["HOST", "LocalHost"],
]);

function getSetting(name: string, fallback?: string): string | undefined {
  return settings.get(name) ?? fallback;
}

function serverUrl(): string {
  const host = getSetting("HOST", "0.0.0.0");
  const port = getSetting("PORT", "3000");
  return `http://${host.toLowerCase()}:${port}`;
}

function toCents(amount: number): number;
function toCents(amount: string): number;
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
