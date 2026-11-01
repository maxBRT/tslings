// TypeScript ships generic "utility types" that build a new type from an
// existing one. The first three change every property at once:
//   Partial<T>    every property becomes optional
//   Required<T>   every property becomes required (the `?` goes away)
//   Readonly<T>   every property becomes readonly
// They stay in sync with `T`: add a field to `User`, `Partial<User>` has it too.
// And they nest: `Readonly<Partial<User>>` is a type like any other.
//
// Fix the three types marked TODO with these utility types.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface User {
  id: string;
  name: string;
  email: string;
}

// TODO: A patch only contains the fields that change.
function applyPatch(user: User, patch: User): User {
  return { ...user, ...patch };
}

interface RequestOptions {
  method?: "GET" | "POST";
  timeoutMs?: number;
  retries?: number;
}

// TODO: The defaults give a value for EVERY option, and they're shared by
// every request, so nothing may change them. Say both in the type.
const DEFAULT_OPTIONS: RequestOptions = Object.freeze({
  method: "GET",
  timeoutMs: 5000,
  retries: 2,
});

// TODO: Once merged with the defaults, every option has a value.
function resolveOptions(options: RequestOptions): RequestOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}

// Don't change the tests below.

test("a patch changes only the given fields", () => {
  const ada: User = { id: "u1", name: "Ada", email: "ada@old.example" };
  const updated = applyPatch(ada, { email: "ada@new.example" });
  assert.deepEqual(updated, { id: "u1", name: "Ada", email: "ada@new.example" });
  assert.deepEqual(applyPatch(ada, { name: "Ada Lovelace" }), { ...ada, name: "Ada Lovelace" });
});

test("resolved options have every value", () => {
  const options = resolveOptions({ retries: 5 });
  const worstCaseMs = options.timeoutMs * (options.retries + 1);
  assert.equal(worstCaseMs, 30_000);
  assert.equal(options.method.toLowerCase(), "get");
  assert.deepEqual(resolveOptions({ method: "POST", timeoutMs: 1000 }), {
    method: "POST",
    timeoutMs: 1000,
    retries: 2,
  });
});

test("the defaults are frozen at runtime too", () => {
  assert.equal(Object.isFrozen(DEFAULT_OPTIONS), true);
});

// Type tests: each line only compiles when the two types are exactly the same.
// `Parameters<F>[1]` is the type of F's second parameter and `ReturnType<F>` the
// type F returns: two more utility types, which utility3 covers.
type _tests = [
  Expect<Equal<Parameters<typeof applyPatch>[1], Partial<User>>>,
  Expect<Equal<ReturnType<typeof resolveOptions>, Required<RequestOptions>>>,
  Expect<Equal<typeof DEFAULT_OPTIONS, Readonly<Required<RequestOptions>>>>,
];
