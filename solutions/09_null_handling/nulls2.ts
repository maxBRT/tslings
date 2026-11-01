// `a ?? b` gives `b` only when `a` is `null` or `undefined`. The older `a || b`
// gives `b` whenever `a` is falsy, which includes `0`, `""` and `false`. Those
// are real values, and `||` silently replaces them. TypeScript can't catch
// that mistake, since both give the same type, so the idiom is to reach for
// `??` whenever you mean "missing".
//
// `a ??= b` assigns `b` only when `a` is null or undefined. It's the short way
// to fill something in the first time it's needed, like a cache entry.
//
// Fill in the HTTP client's defaults, then cache the currency formatters.

import { test } from "node:test";
import assert from "node:assert/strict";

type ClientOptions = {
  baseUrl: string;
  timeoutMs?: number; // 0 means "no timeout"
  retries?: number; // 0 means "don't retry"
  userAgent?: string; // "" means "don't send the header"
};

type ResolvedOptions = {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  userAgent: string;
};

function resolveOptions(options: ClientOptions): ResolvedOptions {
  return {
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs ?? 10_000,
    retries: options.retries ?? 3,
    userAgent: options.userAgent ?? "tslings-client/1.0",
  };
}

// Creating an `Intl.NumberFormat` is slow, so we keep one per currency.
const formatters: Record<string, Intl.NumberFormat> = {};

function currencyFormatter(currency: string): Intl.NumberFormat {
  // Reading `formatters[currency]` gives `Intl.NumberFormat | undefined`
  // (noUncheckedIndexedAccess). The `??=` expression's value is never undefined.
  // With a `Map`, the same idea is written with `get`, `??` and `set`.
  return (formatters[currency] ??= new Intl.NumberFormat("en-US", { style: "currency", currency }));
}

// Don't change the tests below.

test("defaults for missing options", () => {
  assert.deepEqual(resolveOptions({ baseUrl: "https://api.example.com" }), {
    baseUrl: "https://api.example.com",
    timeoutMs: 10_000,
    retries: 3,
    userAgent: "tslings-client/1.0",
  });
});

test("0 and empty strings are real values", () => {
  assert.deepEqual(
    resolveOptions({ baseUrl: "https://api.example.com", timeoutMs: 0, retries: 0, userAgent: "" }),
    { baseUrl: "https://api.example.com", timeoutMs: 0, retries: 0, userAgent: "" },
  );
});

test("formatters are created once per currency", () => {
  assert.equal(currencyFormatter("EUR").format(12.5), "€12.50");
  assert.equal(currencyFormatter("JPY").format(1200), "¥1,200");
  assert.equal(currencyFormatter("EUR"), currencyFormatter("EUR"));
  assert.notEqual(currencyFormatter("EUR"), currencyFormatter("USD"));
});
