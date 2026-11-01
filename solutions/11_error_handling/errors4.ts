// A function that always throws never returns, and its return type can say so: `never`.
// TypeScript uses this in control-flow analysis: code after a call to a `never` function is
// unreachable, so the value it guarded is narrowed. It makes a one-liner like
// `flags.get("--out") ?? fail("--out is required")` have type `string`.
//
// The catch: TypeScript doesn't infer `never` for a function *declaration* that always throws.
// It infers `void`. And it only narrows the code after a call when the `never` is written in
// the function's declared type, like `function fail(...): never`.
//
// A build tool reads its command-line flags into a map, and calls `fail` in three places when
// one is wrong. Make all three type-check.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Flags = ReadonlyMap<string, string>;
type Format = "esm" | "cjs" | "iife";

// The annotation is what makes `fail(...)` end a code path, like `throw` or `return` would.
function fail(message: string): never {
  throw new Error(message);
}

function outDir(flags: Flags): string {
  // `string | never` is just `string`: `never` disappears from unions.
  return flags.get("--out") ?? fail("--out is required");
}

function requireFlag(flags: Flags, name: string): string {
  const value = flags.get(name);
  if (value === undefined || value.trim() === "") {
    fail(`${name} is required`);
  }
  return value;
}

function format(flags: Flags): Format {
  const value = flags.get("--format") ?? "esm";
  if (value === "esm" || value === "cjs" || value === "iife") {
    return value;
  }
  // No "missing return" error: TypeScript knows this call ends the function.
  fail(`--format must be esm, cjs or iife, got "${value}"`);
}

// Don't change the tests below.

// The flags of `build --entry src/index.ts --out dist --format cjs --target " "`.
const flags: Flags = new Map([
  ["--entry", "src/index.ts"],
  ["--out", "dist"],
  ["--format", "cjs"],
  ["--target", " "],
]);
const noFlags: Flags = new Map();

test("outDir", () => {
  assert.equal(outDir(flags), "dist");
  assert.throws(() => outDir(noFlags), /--out is required/);
});

test("requireFlag", () => {
  assert.equal(requireFlag(flags, "--entry"), "src/index.ts");
  assert.throws(() => requireFlag(flags, "--target"), /--target is required/);
  assert.throws(() => requireFlag(flags, "--tsconfig"), /--tsconfig is required/);
});

test("format", () => {
  assert.equal(format(flags), "cjs");
  assert.equal(format(noFlags), "esm");
  assert.throws(() => format(new Map([["--format", "umd"]])), /got "umd"/);
});

type _tests = [Expect<Equal<ReturnType<typeof fail>, never>>];
