// When TypeScript infers `T` from `["posts:read", "posts:write"]`, it widens
// it to `string[]`. That's right for most arrays, but sometimes the exact
// values ARE the point. Adding `const` before a type parameter (`<const T>`,
// TypeScript 5.0) makes inference work as if the caller had written
// `as const`: `T` becomes `readonly ["posts:read", "posts:write"]`.
//
// Libraries use this so callers get precise types without writing `as const`
// themselves. Below, `T[number]` means "the type of T's elements": once `T`
// is a tuple of literals, it's the union of the permission names.
//
// Make `definePermissions` infer the exact names it's given.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: Change how `T` is inferred, without touching the callers.
function definePermissions<T extends readonly string[]>(names: T) {
  const granted = new Set<T[number]>();
  return {
    names,
    grant(name: T[number]): void {
      granted.add(name);
    },
    can(name: T[number]): boolean {
      return granted.has(name);
    },
  };
}

// Don't change the tests below.

test("grants and checks blog permissions", () => {
  const blog = definePermissions(["posts:read", "posts:write", "posts:delete"]);
  type _test = Expect<
    Equal<typeof blog.names, readonly ["posts:read", "posts:write", "posts:delete"]>
  >;
  // With exact names, a typo like `blog.grant("posts:raed")` doesn't compile.
  blog.grant("posts:read");
  assert.equal(blog.can("posts:read"), true);
  assert.equal(blog.can("posts:delete"), false);
});

test("works for any list of names", () => {
  const billing = definePermissions(["invoices:view", "refunds:issue"]);
  type _test = Expect<Equal<typeof billing.names, readonly ["invoices:view", "refunds:issue"]>>;
  billing.grant("refunds:issue");
  assert.equal(billing.can("refunds:issue"), true);
  assert.deepEqual(billing.names, ["invoices:view", "refunds:issue"]);
});
