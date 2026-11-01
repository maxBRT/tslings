// An assertion function checks a value and throws if it's wrong. Its return type,
// `asserts value is string`, tells TypeScript: "if this call returns at all, `value` is a
// string". After the call, the value is narrowed, with no `if` around it.
//
// Assertion functions fit places where a bad value is not something to recover from, like
// configuration checked once at startup: fail fast, with a clear message.
//
// `assertIsObject` is done. Make `assertIsString` an assertion function, then write
// `assertIsPort` the same way, so that `loadServerConfig` type-checks.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type ServerConfig = {
  readonly host: string;
  readonly port: number;
};

function assertIsObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

// TODO: Throwing isn't enough, the return type must say what the function proves.
function assertIsString(value: unknown, name: string): void {
  if (typeof value !== "string" || value === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

// TODO: Throw a `TypeError` mentioning `name` unless `value` is an integer from 1 to 65535.
function assertIsPort(value: unknown, name: string): void {}

function loadServerConfig(json: string): ServerConfig {
  const raw: unknown = JSON.parse(json);
  assertIsObject(raw, "config");
  const { host, port } = raw;
  assertIsString(host, "host");
  assertIsPort(port, "port");
  return { host, port };
}

// Don't change the tests below.

test("loads a valid config", () => {
  assert.deepEqual(loadServerConfig('{ "host": "0.0.0.0", "port": 8080 }'), {
    host: "0.0.0.0",
    port: 8080,
  });
});

test("rejects a config that is not an object", () => {
  assert.throws(() => loadServerConfig("null"), TypeError);
  assert.throws(() => loadServerConfig("[]"), /config/);
});

test("rejects a missing or empty host", () => {
  assert.throws(() => loadServerConfig('{ "port": 8080 }'), /host/);
  assert.throws(() => loadServerConfig('{ "host": "", "port": 8080 }'), /host/);
});

test("rejects ports that are not integers from 1 to 65535", () => {
  for (const port of ['"8080"', "0", "65536", "80.5", "-1", "null"]) {
    assert.throws(() => loadServerConfig(`{ "host": "localhost", "port": ${port} }`), TypeError);
  }
  assert.throws(() => loadServerConfig('{ "host": "localhost" }'), /port/);
  assert.equal(loadServerConfig('{ "host": "localhost", "port": 65535 }').port, 65535);
});

type _tests = [
  Expect<Equal<typeof assertIsString, (value: unknown, name: string) => asserts value is string>>,
  Expect<Equal<typeof assertIsPort, (value: unknown, name: string) => asserts value is number>>,
];
