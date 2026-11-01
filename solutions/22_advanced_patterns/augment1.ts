// In Express, Fastify and most HTTP frameworks, an auth middleware attaches the logged-in user to
// the request, and later code reads `request.user`. But the framework's `HttpRequest` type has
// no `user`, because the library can't know what your app adds to it.
//
// Interfaces are open: two `interface` declarations with the same name merge into one. To merge
// into an interface exported by another module, write a *module augmentation*:
//
//   declare module "./some-module.ts" {
//     interface TheirInterface { extra: string }
//   }
//
// `declare global { interface ... }` does the same for globals. Type aliases never merge, which
// is one reason libraries expose interfaces for this kind of extension.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";
import { createApp } from "./http.ts";
import type { HttpRequest, Middleware } from "./http.ts";

type User = { id: string; role: "admin" | "member" };

// This block adds a member to the `HttpRequest` interface of `./http.ts`, for every file that
// uses it. The augmentation can use the local `User` type, because it lives in this module.
declare module "./http.ts" {
  interface HttpRequest {
    // Optional: only requests that went through `authenticate` have a user.
    user?: User;
  }
}

const sessions = new Map<string, User>([
  ["tok_ada", { id: "usr_ada", role: "admin" }],
  ["tok_bob", { id: "usr_bob", role: "member" }],
]);

const authenticate: Middleware = (request) => {
  const token = request.headers["authorization"]?.replace(/^Bearer /, "");
  const user = token === undefined ? undefined : sessions.get(token);
  if (user === undefined) return { status: 401, body: "Unauthorized" };
  request.user = user;
  return undefined;
};

const requireAdmin: Middleware = (request) =>
  request.user?.role === "admin" ? undefined : { status: 403, body: "Forbidden" };

const adminApp = createApp([authenticate, requireAdmin], (request) => ({
  status: 200,
  body: `Welcome, ${request.user?.id ?? "stranger"}`,
}));

// Don't change the tests below.

const get = (token?: string): HttpRequest => ({
  method: "GET",
  path: "/admin",
  headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
});

test("admins get in", () => {
  assert.deepEqual(adminApp(get("tok_ada")), { status: 200, body: "Welcome, usr_ada" });
});

test("members are forbidden, strangers unauthorized", () => {
  assert.deepEqual(adminApp(get("tok_bob")), { status: 403, body: "Forbidden" });
  assert.deepEqual(adminApp(get()), { status: 401, body: "Unauthorized" });
});

type _tests = [Expect<Equal<HttpRequest["user"], User | undefined>>];
