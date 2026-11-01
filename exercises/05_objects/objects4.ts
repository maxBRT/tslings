// TypeScript compares types by shape, not by name ("structural typing"): a
// value fits a type when it has the properties the type asks for, even if it
// has more, and even if it was written without knowing the type exists. There's
// no `implements` needed. That's why a plain object can stand in for a real
// logger in tests, and why `console` itself fits the `Logger` below.
//
// One exception: an object literal written directly where a type is expected
// may not have unknown properties. They can't be used through that type, so
// TypeScript assumes they're typos ("excess property checks").
//
// Fix the mistake TypeScript found in `POLICY`, then finish `createMemoryLogger`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

interface RetryPolicy {
  /** Defaults to 1: no retries. */
  maxAttempts?: number;
}

// TODO: Fix this policy.
const POLICY: RetryPolicy = { maxAttempt: 3 };

function withRetries(task: () => boolean, policy: RetryPolicy, logger: Logger): boolean {
  const maxAttempts = policy.maxAttempts ?? 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (task()) {
      logger.info(`succeeded on attempt ${attempt}`);
      return true;
    }
    logger.warn(`attempt ${attempt} of ${maxAttempts} failed`);
  }
  return false;
}

// TODO: The tests need a logger that records lines instead of printing them.
// Add what's missing for it to fit `Logger`, and keep the `lines` property.
function createMemoryLogger() {
  const lines: string[] = [];
  return {
    lines,
    info(message: string) {
      lines.push(`info: ${message}`);
    },
  };
}

// Don't change the tests below.

// Fails twice, then succeeds.
function flakyTask(): () => boolean {
  let calls = 0;
  return () => {
    calls++;
    return calls === 3;
  };
}

test("retries until the task succeeds", () => {
  const logger = createMemoryLogger();
  assert.equal(withRetries(flakyTask(), POLICY, logger), true);
  assert.deepEqual(logger.lines, [
    "warn: attempt 1 of 3 failed",
    "warn: attempt 2 of 3 failed",
    "info: succeeded on attempt 3",
  ]);
});

test("gives up after the last attempt", () => {
  const logger = createMemoryLogger();
  assert.equal(withRetries(() => false, POLICY, logger), false);
  assert.equal(logger.lines.length, 3);
});

test("extra properties are fine on values that aren't fresh literals", () => {
  // Like an object parsed from a config file: `owner` isn't part of the policy.
  const fromConfig = { maxAttempts: 1, owner: "platform-team" };
  const logger = createMemoryLogger();
  assert.equal(withRetries(() => true, fromConfig, logger), true);
  // `console` has `info` and `warn` too, so it is a Logger.
  assert.equal(withRetries(() => true, fromConfig, console), true);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<RetryPolicy, { maxAttempts?: number }>>,
  Expect<Equal<typeof POLICY, RetryPolicy>>,
];
