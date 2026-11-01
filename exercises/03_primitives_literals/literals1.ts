// A literal type has exactly one value: the type `"up"` only accepts the string "up".
// A union of literal types lists every value allowed:
//
//   type Direction = "up" | "down" | "left" | "right";
//
// This is how TypeScript developers write what other languages call an enum. Nothing
// exists at runtime, the values are plain strings, but the type checker rejects every
// other string, typos included, and your editor autocompletes the valid ones.
//
// TODO: Replace `string` with a union of the four levels the logger supports: "debug",
// "info", "warn" and "error". TypeScript will then find a bug that `string` was hiding.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type LogLevel = string;

function severity(level: LogLevel): number {
  if (level === "debug") {
    return 0;
  }
  if (level === "info") {
    return 1;
  }
  if (level === "warning") {
    return 2;
  }
  return 3;
}

// Production logs skip everything below the configured minimum level.
function shouldLog(level: LogLevel, minimum: LogLevel): boolean {
  return severity(level) >= severity(minimum);
}

// Don't change the tests below.

test("levels are ordered", () => {
  assert.equal(severity("debug"), 0);
  assert.equal(severity("info"), 1);
  assert.equal(severity("warn"), 2);
  assert.equal(severity("error"), 3);
});

test("filters below the minimum level", () => {
  assert.equal(shouldLog("debug", "info"), false);
  assert.equal(shouldLog("warn", "info"), true);
  assert.equal(shouldLog("warn", "error"), false);
  assert.equal(shouldLog("error", "error"), true);
});

type _tests = [Expect<Equal<LogLevel, "debug" | "info" | "warn" | "error">>];
