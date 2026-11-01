// Array methods are eager: `.map()` builds a whole new array before `.filter()` even starts.
// Iterators can be lazy. Since Node 22 they have their own `map`, `filter`, `take`, `drop`,
// `flatMap`, `find`, `some`... and `toArray()`. Each value goes through the whole pipeline
// before the next one is read, so a pipeline can stop as soon as it has what it needs.
//
// TypeScript puts these helpers on `IteratorObject<T>`, the type of what generators,
// `array.values()`, `map.keys()` and friends return. A plain `Iterable<T>` only promises a
// `[Symbol.iterator]()` method, so it has no helpers: wrap it with `Iterator.from(iterable)`.
//
// TODO: Make `firstErrors` a lazy pipeline that stops reading lines once it has `limit` errors.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type LogEntry =
  | { readonly level: "info" | "warn"; readonly message: string }
  | { readonly level: "error"; readonly code: string; readonly message: string };

type ErrorEntry = Extract<LogEntry, { level: "error" }>;

/** Parses lines like `ERROR E42 Payment failed` or `INFO Server started`. */
function parseLine(line: string): LogEntry {
  const [level = "", ...words] = line.split(" ");
  if (level === "ERROR") {
    const [code = "E0", ...message] = words;
    return { level: "error", code, message: message.join(" ") };
  }
  return { level: level === "WARN" ? "warn" : "info", message: words.join(" ") };
}

/** The first `limit` errors of a log, which can be huge. */
function firstErrors(lines: Iterable<string>, limit: number): ErrorEntry[] {
  return lines
    .map(parseLine)
    .filter((entry) => entry.level === "error")
    .slice(0, limit);
}

// Don't change the tests below.

/** Yields the lines one at a time, like a file being read, and counts how many were read. */
function* readLog(lines: readonly string[], stats: { read: number }): Generator<string> {
  for (const line of lines) {
    stats.read++;
    yield line;
  }
}

const LOG = [
  "INFO Server started",
  "WARN Disk 80% full",
  "ERROR E42 Payment failed",
  "INFO GET /checkout",
  "ERROR E17 Out of stock",
  "ERROR E42 Payment failed",
  ...Array.from({ length: 10_000 }, (_, i) => `INFO GET /products/${i}`),
];

test("finds the first errors", () => {
  assert.deepEqual(firstErrors(LOG, 2), [
    { level: "error", code: "E42", message: "Payment failed" },
    { level: "error", code: "E17", message: "Out of stock" },
  ]);
});

test("returns fewer errors when the log has fewer", () => {
  assert.equal(firstErrors(LOG, 10).length, 3);
  assert.deepEqual(firstErrors(new Set(["INFO all good"]), 1), []);
});

test("stops reading as soon as it has enough errors", () => {
  const stats = { read: 0 };
  firstErrors(readLog(LOG, stats), 2);
  assert.equal(stats.read, 5, `read ${stats.read} lines to find 2 errors, instead of 5`);
});

test("accepts any iterable", () => {
  const oneLine: Iterable<string> = {
    *[Symbol.iterator]() {
      yield "ERROR E1 Boom";
    },
  };
  assert.deepEqual(firstErrors(oneLine, 1), [{ level: "error", code: "E1", message: "Boom" }]);
});

type _tests = [Expect<Equal<ReturnType<typeof firstErrors>, ErrorEntry[]>>];
