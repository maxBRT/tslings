// A `number` is a 64-bit float: integers are exact only up to `Number.MAX_SAFE_INTEGER`
// (about 9 * 10^15). Past that, `number` silently rounds. For bigger integers, JavaScript
// has a second numeric primitive, `bigint`, written with an `n` suffix: `42n`, `1_000n`.
//
// TypeScript keeps `bigint` and `number` apart: arithmetic that mixes them is an error.
// You convert explicitly, with `Number(big)` or `BigInt(small)`, and the place where you
// convert is where you decide whether precision can be lost.
//
// `process.hrtime.bigint()` returns a timestamp in nanoseconds, as a `bigint`: after a few
// months of uptime, there are too many nanoseconds for a `number` to hold exactly.
//
// TODO: Fix `elapsedMs` and `deadlineNs`.

import { test } from "node:test";
import assert from "node:assert/strict";

// Milliseconds between two timestamps, with sub-millisecond precision.
function elapsedMs(startNs: bigint, endNs: bigint): number {
  return (endNs - startNs) / 1_000_000;
}

// The timestamp at which a timeout of `timeoutMs` milliseconds expires.
function deadlineNs(startNs: bigint, timeoutMs: number): bigint {
  return startNs + timeoutMs * 1_000_000;
}

// Don't change the tests below.

// About 4 years of uptime, in nanoseconds: far beyond Number.MAX_SAFE_INTEGER.
const START_NS = 123_456_789_012_345_678n;

test("elapsed time keeps its precision", () => {
  assert.equal(elapsedMs(START_NS, START_NS + 1_234_567n), 1.234567);
  assert.equal(elapsedMs(START_NS, START_NS + 2_000_000_000n), 2000);
});

test("measures real time", () => {
  const start = process.hrtime.bigint();
  const elapsed = elapsedMs(start, process.hrtime.bigint());
  assert.ok(elapsed >= 0 && elapsed < 1000);
});

test("computes the deadline to the nanosecond", () => {
  assert.equal(deadlineNs(START_NS, 250), 123_456_789_262_345_678n);
  assert.equal(deadlineNs(0n, 1), 1_000_000n);
});
