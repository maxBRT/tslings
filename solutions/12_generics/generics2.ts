// Inside a generic function, `T` could be any type at all, so TypeScript only
// lets you do what works for EVERY type. Most types have no `id`, so `item.id`
// doesn't compile. A constraint narrows the possibilities:
// `<T extends { id: string }>` means "any type, as long as it has a string `id`".
//
// The constraint limits what callers may pass, but `T` is still the caller's
// own type: upserting a `User` gives back `User[]`, with every `User` field.
//
// Add a constraint to `upsert` so it compiles.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Replaces the item that has the same id, or appends it at the end.
// It never mutates `items`: `with` returns a copy with one element replaced.
// Writing `(items: readonly { id: string }[], item: { id: string })` without a
// type parameter would also compile, but callers would get back
// `{ id: string }[]` and lose every other field. The constraint keeps `T`.
//
// TypeScript infers `T` from BOTH arguments. With an untyped literal as
// `item`, it may pick a wider type than `User` (`role: string`). The tests
// pass typed values; chapter 22 shows `NoInfer<T>` to infer from `items` only.
function upsert<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  return index === -1 ? [...items, item] : items.with(index, item);
}

// Don't change the tests below.

interface User {
  id: string;
  name: string;
  role: "admin" | "member";
}

interface CartLine {
  id: string;
  sku: string;
  quantity: number;
}

const users: readonly User[] = [
  { id: "u1", name: "Ada", role: "admin" },
  { id: "u2", name: "Linus", role: "member" },
];

test("replaces an existing user", () => {
  const promoted: User = { id: "u2", name: "Linus", role: "admin" };
  const next = upsert(users, promoted);
  type _test = Expect<Equal<typeof next, User[]>>;
  assert.deepEqual(next.map((user) => user.role), ["admin", "admin"]);
  assert.equal(users[1]?.role, "member", "the original array must not change");
});

test("appends a new user", () => {
  const grace: User = { id: "u3", name: "Grace", role: "member" };
  const next = upsert(users, grace);
  assert.deepEqual(next.map((user) => user.name), ["Ada", "Linus", "Grace"]);
});

test("works for any type with an id", () => {
  const cart: CartLine[] = [{ id: "l1", sku: "MUG-01", quantity: 1 }];
  const next = upsert(cart, { id: "l1", sku: "MUG-01", quantity: 3 });
  type _test = Expect<Equal<typeof next, CartLine[]>>;
  assert.equal(next[0]?.quantity, 3);
});
