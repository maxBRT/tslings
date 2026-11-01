// `enum` is one of the few TypeScript features that generate JavaScript: the compiler turns it
// into an object. Node only erases types, so it can't run enums (`erasableSyntaxOnly`), and
// many TypeScript teams avoid them anyway. The usual replacements:
//   - a union of string literals, `type Level = "debug" | "info"`, when you only need a type;
//   - an object marked `as const`, when you also need the values at runtime (to list them, or
//     to write `Level.Info`), with a type of the same name derived from it:
//       const Level = { Debug: "debug", Info: "info" } as const;
//       type Level = (typeof Level)[keyof typeof Level]; // "debug" | "info"
//     A value and a type can share a name: TypeScript knows which one you mean from where you
//     use it.
//
// Replace the `LogLevel` enum, so that the logger and the tests work unchanged.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: Replace this enum with an `as const` object and a type, both named `LogLevel`.
enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

const SEVERITY: Record<LogLevel, number> = {
  [LogLevel.Debug]: 10,
  [LogLevel.Info]: 20,
  [LogLevel.Warn]: 30,
  [LogLevel.Error]: 40,
};

class Logger {
  readonly #minLevel: LogLevel;
  readonly lines: string[] = [];

  constructor(minLevel: LogLevel) {
    this.#minLevel = minLevel;
  }

  log(level: LogLevel, message: string): void {
    if (SEVERITY[level] >= SEVERITY[this.#minLevel]) {
      this.lines.push(`[${level.toUpperCase()}] ${message}`);
    }
  }
}

// Don't change the tests below.

test("logs messages at or above the minimum level", () => {
  const logger = new Logger(LogLevel.Warn);
  logger.log(LogLevel.Info, "server started");
  logger.log(LogLevel.Warn, "disk 91% full");
  logger.log(LogLevel.Error, "disk full");
  assert.deepEqual(logger.lines, ["[WARN] disk 91% full", "[ERROR] disk full"]);
});

test("plain strings work too", () => {
  // A string enum would reject "debug": enums only accept their own members.
  const logger = new Logger("debug");
  logger.log("debug", "cache miss for user:42");
  assert.deepEqual(logger.lines, ["[DEBUG] cache miss for user:42"]);
});

test("the levels can be listed at runtime", () => {
  assert.deepEqual(Object.values(LogLevel), ["debug", "info", "warn", "error"]);
});

type _tests = [
  Expect<Equal<LogLevel, "debug" | "info" | "warn" | "error">>,
  Expect<Equal<typeof LogLevel.Warn, "warn">>,
];
