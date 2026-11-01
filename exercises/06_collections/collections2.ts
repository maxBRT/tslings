// `Set<T>` holds unique values. Node 22+ gives sets methods for set algebra.
// None of them change the sets involved; the first three return a new set:
//   a.union(b)          everything in `a` or `b`
//   a.intersection(b)   only what's in both
//   a.difference(b)     what's in `a` but not in `b`
//   a.isSupersetOf(b)   whether `a` contains everything in `b`
//
// Like an array literal, `new Set(["read"])` infers its type from the values
// and widens string literals: you get a `Set<string>`, which won't fit where a
// `Set<Permission>` is expected. Pass the element type yourself:
// `new Set<Permission>(["read"])`. Take sets you only read as `ReadonlySet<T>`.
//
// A document editor computes what each user may do. Fix the role constants,
// then write the three functions with set methods.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Permission = "read" | "comment" | "edit" | "share" | "delete";
type Role = "viewer" | "editor";

// TODO: These are inferred as `Set<string>`. Pass the element type to `new Set`.
const VIEWER = new Set(["read", "comment"]);
const EDITOR = new Set(["read", "comment", "edit", "share"]);

const ROLES: Record<Role, ReadonlySet<Permission>> = { viewer: VIEWER, editor: EDITOR };

// TODO: The role's permissions, plus the granted ones, minus the revoked ones.
function effectivePermissions(
  role: ReadonlySet<Permission>,
  granted: ReadonlySet<Permission>,
  revoked: ReadonlySet<Permission>,
): Set<Permission> {}

// TODO: The permissions that both roles have.
function sharedPermissions(
  a: ReadonlySet<Permission>,
  b: ReadonlySet<Permission>,
): Set<Permission> {}

// TODO: Whether `user` has every permission in `required`.
function canDo(user: ReadonlySet<Permission>, required: ReadonlySet<Permission>): boolean {}

// Don't change the tests below.

test("effective permissions", () => {
  const granted = new Set<Permission>(["share"]);
  const revoked = new Set<Permission>(["comment"]);
  const viewer = effectivePermissions(ROLES.viewer, granted, revoked);
  assert.deepEqual(viewer, new Set(["read", "share"]));
  assert.deepEqual(effectivePermissions(ROLES.editor, new Set(), new Set()), ROLES.editor);
});

test("the role itself is not changed", () => {
  effectivePermissions(ROLES.viewer, new Set(["delete"]), new Set(["read"]));
  assert.deepEqual(ROLES.viewer, new Set(["read", "comment"]));
});

test("shared permissions", () => {
  assert.deepEqual(sharedPermissions(ROLES.viewer, ROLES.editor), new Set(["read", "comment"]));
  assert.deepEqual(sharedPermissions(ROLES.viewer, new Set(["delete"])), new Set());
});

test("can do", () => {
  assert.equal(canDo(ROLES.editor, new Set(["edit", "share"])), true);
  assert.equal(canDo(ROLES.viewer, new Set(["read", "edit"])), false);
  assert.equal(canDo(ROLES.viewer, new Set()), true);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<typeof VIEWER, Set<Permission>>>,
  Expect<Equal<typeof EDITOR, Set<Permission>>>,
  Expect<Equal<Permission, "read" | "comment" | "edit" | "share" | "delete">>,
];
