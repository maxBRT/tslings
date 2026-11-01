// A bag of optional fields lets impossible states compile: "loading, with a
// user, and an error". It doesn't help TypeScript either. Knowing that
// `status` is "success" says nothing about `user`, so every read of `user`
// needs a check that "can't fail".
//
// Model each state as its own member of a union instead, carrying exactly the
// data that exists in that state. Checking `status` then hands you that data.
// This is what TypeScript developers mean by "make illegal states
// unrepresentable".
//
// Rewrite `ProfileState`. `render` is already written the way you'd want to
// write it; don't change it.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type User = { name: string; followers: number };

// Each state is its own object type. Naming them (`type Loading = ...`) is
// also fine when other code needs to refer to one state.
type ProfileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: User }
  | { status: "error"; error: Error };

function render(state: ProfileState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "loading":
      return "Loading profile…";
    case "success":
      return `${state.user.name} · ${state.user.followers} followers`;
    case "error":
      return `Could not load the profile: ${state.error.message}`;
  }
}

// Don't change the tests below.

test("render each state", () => {
  assert.equal(render({ status: "idle" }), "");
  assert.equal(render({ status: "loading" }), "Loading profile…");
  assert.equal(
    render({ status: "success", user: { name: "Ada", followers: 1815 } }),
    "Ada · 1815 followers",
  );
  assert.equal(
    render({ status: "error", error: new Error("timeout") }),
    "Could not load the profile: timeout",
  );
});

// Type tests: each line only compiles when the two types are exactly the same.
// `Extract<ProfileState, { status: "success" }>` picks the member of the union
// whose status is "success", and `keyof` gives the names of its fields.
type _tests = [
  Expect<Equal<ProfileState["status"], "idle" | "loading" | "success" | "error">>,
  // "idle" and "loading" carry no data.
  Expect<Equal<keyof Extract<ProfileState, { status: "idle" | "loading" }>, "status">>,
  // A success always has a user (not `User | undefined`), and no error.
  Expect<Equal<Extract<ProfileState, { status: "success" }>["user"], User>>,
  Expect<Equal<keyof Extract<ProfileState, { status: "success" }>, "status" | "user">>,
  // An error always has an error, and no user.
  Expect<Equal<Extract<ProfileState, { status: "error" }>["error"], Error>>,
  Expect<Equal<keyof Extract<ProfileState, { status: "error" }>, "status" | "error">>,
];
