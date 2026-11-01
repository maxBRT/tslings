import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// A union of literals instead of an `enum`: the values are plain strings at runtime,
// and there's nothing to import to use them.
type LogLevel = "debug" | "info" | "warn" | "error";

function severity(level: LogLevel): number {
  if (level === "debug") {
    return 0;
  }
  if (level === "info") {
    return 1;
  }
  // With `string`, the typo "warning" compiled and every warning counted as an error.
  // With the union, TypeScript knew `level` could never be "warning" here.
  if (level === "warn") {
    return 2;
  }
  return 3;
}

function shouldLog(level: LogLevel, minimum: LogLevel): boolean {
  return severity(level) >= severity(minimum);
}

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
