// `infer` declares a type variable inside the `extends` pattern. When the pattern
// matches, TypeScript fills the variable with whatever sits in that position:
//
//   type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
//   // ElementOf<string[]> is string, ElementOf<number> is never
//
// Built-ins like `ReturnType` and `Awaited` are written this way. Frameworks such as
// React Router and Remix use the same trick so a page knows the type of the data its
// `loader` returns, without anyone writing that type twice.
//
// Write `LoaderData<F>`: for an async function returning a `JsonResponse`, the type of
// the response's `data`. Anything else gives `never`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type JsonResponse<T> = { readonly status: number; readonly data: T };

function json<T>(data: T, status = 200): JsonResponse<T> {
  return { status, data };
}

async function userLoader(userId: string) {
  // A real loader would query a database here.
  return json({ id: userId, name: "Ada Lovelace", roles: ["admin", "author"] });
}

// TODO: Match "a function returning a Promise of a JsonResponse" and infer the data type.
type LoaderData<F> = unknown;

function renderUserPage(user: LoaderData<typeof userLoader>): string {
  return `${user.name} (${user.roles.join(", ")})`;
}

// Don't change the tests below.

test("the page renders what the loader returned", async () => {
  const response = await userLoader("u-1");
  assert.equal(response.status, 200);
  assert.equal(renderUserPage(response.data), "Ada Lovelace (admin, author)");
});

type _tests = [
  Expect<Equal<LoaderData<typeof userLoader>, { id: string; name: string; roles: string[] }>>,
  Expect<Equal<LoaderData<() => Promise<JsonResponse<number[]>>>, number[]>>,
  // Not async, or not a function at all: no loader data.
  Expect<Equal<LoaderData<() => JsonResponse<string>>, never>>,
  Expect<Equal<LoaderData<string>, never>>,
];
