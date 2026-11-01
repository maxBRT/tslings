// A function that always throws never returns, and its return type can say so: `never`.
// TypeScript uses this in control-flow analysis: code after a call to a `never` function is
// unreachable, so the value it guarded is narrowed. It makes a one-liner like
// `env.API_KEY ?? fail("API_KEY is missing")` have type `string`.
//
// The catch: TypeScript doesn't infer `never` for a function *declaration* that always throws.
// It infers `void`. And it only narrows the code after a call when the `never` is written in
// the function's declared type, like `function fail(...): never`.
//
// The config loader below calls `fail` in three places. Make all three type-check.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Env = Readonly<Record<string, string | undefined>>;
type Mode = "development" | "production" | "test";

// TODO: Tell TypeScript that this function never returns.
function fail(message: string) {
  throw new Error(message);
}

function databaseUrl(env: Env): string {
  return env.DATABASE_URL ?? fail("DATABASE_URL is not set");
}

function requireEnv(env: Env, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    fail(`${name} is not set`);
  }
  return value;
}

function mode(env: Env): Mode {
  const value = env.NODE_ENV ?? "development";
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }
  fail(`NODE_ENV must be development, production or test, got "${value}"`);
}

// Don't change the tests below.

const env: Env = {
  DATABASE_URL: "postgres://localhost/shop",
  API_KEY: "sk_test_123",
  EMPTY: "  ",
  NODE_ENV: "production",
};

test("databaseUrl", () => {
  assert.equal(databaseUrl(env), "postgres://localhost/shop");
  assert.throws(() => databaseUrl({}), /DATABASE_URL is not set/);
});

test("requireEnv", () => {
  assert.equal(requireEnv(env, "API_KEY"), "sk_test_123");
  assert.throws(() => requireEnv(env, "EMPTY"), /EMPTY is not set/);
  assert.throws(() => requireEnv(env, "SMTP_HOST"), /SMTP_HOST is not set/);
});

test("mode", () => {
  assert.equal(mode(env), "production");
  assert.equal(mode({}), "development");
  assert.throws(() => mode({ NODE_ENV: "staging" }), /got "staging"/);
});

type _tests = [Expect<Equal<ReturnType<typeof fail>, never>>];
