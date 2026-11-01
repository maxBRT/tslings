// Template literal types also work as patterns. With `infer` (chapter 18), TypeScript
// pulls the matching pieces out of a string literal type:
//
//   type Domain<E> = E extends `${string}@${infer D}` ? D : never;
//   // Domain<"ada@example.com"> is "example.com"
//
// Routers like React Router and Hono use this to read the `:params` of a path pattern,
// so building a link without a param, or with a misspelled one, fails to compile.
//
// `ParamName<Path>` handles a single `:param` at the end of the path, but breaks on
// "/users/:userId/posts/:postId". Make it return the union of all the param names.
// A path can have any number of params, so `ParamName` will need to call itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: Stop each name at the next "/", and look for more params after it.
type ParamName<Path extends string> = Path extends `${string}:${infer Name}` ? Name : never;

type RouteParams<Path extends string> = { [K in ParamName<Path>]: string };

// Builds a URL from a path pattern, like `generatePath` in React Router.
function href<Path extends string>(path: Path, params: RouteParams<Path>): string {
  const values: Readonly<Record<string, string>> = params;
  return path.replaceAll(/:(\w+)/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`Missing route param "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
}

function userPostLink(userId: string, postId: string): string {
  return href("/users/:userId/posts/:postId", { userId, postId });
}

function invoiceDownloadLink(invoiceId: string): string {
  return href("/invoices/:invoiceId/download", { invoiceId });
}

// Don't change the tests below.

test("links are built from their path pattern", () => {
  assert.equal(href("/users/:userId", { userId: "42" }), "/users/42");
  assert.equal(userPostLink("42", "7"), "/users/42/posts/7");
  assert.equal(invoiceDownloadLink("INV 2026/11"), "/invoices/INV%202026%2F11/download");
  assert.equal(href("/about", {}), "/about");
});

type _tests = [
  Expect<Equal<ParamName<"/users/:userId">, "userId">>,
  Expect<Equal<ParamName<"/users/:userId/posts/:postId">, "userId" | "postId">>,
  Expect<Equal<ParamName<"/orgs/:org/repos/:repo/issues/:issue">, "org" | "repo" | "issue">>,
  Expect<Equal<ParamName<"/invoices/:invoiceId/download">, "invoiceId">>,
  Expect<Equal<ParamName<"/about">, never>>,
  Expect<Equal<RouteParams<"/users/:userId/posts/:postId">, { userId: string; postId: string }>>,
];
