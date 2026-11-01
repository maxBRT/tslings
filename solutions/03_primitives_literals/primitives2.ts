import { test } from "node:test";
import assert from "node:assert/strict";

function elapsedMs(startNs: bigint, endNs: bigint): number {
  // Subtract as bigints first: the difference is small, so converting it to a number is
  // exact. `Number(endNs) - Number(startNs)` would round both huge timestamps first, and
  // `(endNs - startNs) / 1_000_000n` would truncate, since bigint division drops decimals.
  return Number(endNs - startNs) / 1_000_000;
}

function deadlineNs(startNs: bigint, timeoutMs: number): bigint {
  // `BigInt()` throws a RangeError for numbers with decimals, like `BigInt(1.5)`.
  // Timeouts in whole milliseconds are fine.
  return startNs + BigInt(timeoutMs) * 1_000_000n;
}

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
