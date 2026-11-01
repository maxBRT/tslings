// There are three ways to give a value a type, and they don't do the same thing:
//
// - `const x: T = value` (annotation): `x` IS a `T` from now on. TypeScript forgets what it
//   knew about this exact value. That's what you want for a variable that will hold other
//   `T`s later.
// - `value as T` (assertion): "trust me". TypeScript only rejects casts between types that
//   can't overlap at all, so a missing field slips through unnoticed.
// - `value satisfies T`: TypeScript checks that the value fits `T`, and `x` keeps the precise
//   type inferred from the value. `as const satisfies T` also keeps every string literal.
//
// In utility5, `satisfies` kept a table's keys. Here, pick the right tool for each value.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Method = "GET" | "POST" | "DELETE";
type Route = { method: Method; path: string; auth: boolean };

// Each entry is still checked against `Route` (a typo like `methd` or `method: "PUT"` is an
// error). `satisfies` alone keeps the keys, but widens each path to `string`, because `Route`
// says `path: string`. `as const` keeps "/orders" and "/health", and makes the table readonly.
const routes = {
  listOrders: { method: "GET", path: "/orders", auth: true },
  createOrder: { method: "POST", path: "/orders", auth: true },
  health: { method: "GET", path: "/health", auth: false },
} as const satisfies Record<string, Route>;

type RouteName = keyof typeof routes;
// The paths the server answers. `link` only accepts these, so a link can't lead nowhere.
type ServedPath = (typeof routes)[RouteName]["path"];

// `as Route` hid the missing `auth` field; `satisfies` reports it.
const notFound = { method: "GET", path: "/404", auth: false } satisfies Route;

// The one place for an annotation: without it, `current` would get the type of `notFound`
// (`method: "GET"`, `auth: false`), and no other route could be stored in it.
let current: Route = notFound;

function formatRoute(route: Route): string {
  return `${route.method} ${route.path}${route.auth ? " (login required)" : ""}`;
}

function describeRoute(name: RouteName): string {
  return formatRoute(routes[name]);
}

// The router calls this with the route that matched the request.
function enter(route: Route): void {
  current = route;
}

function link(path: ServedPath): string {
  return `https://shop.example.com${path}`;
}

// Don't change the tests below.

test("describes routes by name", () => {
  assert.equal(describeRoute("createOrder"), "POST /orders (login required)");
  assert.equal(describeRoute("health"), "GET /health");
});

test("the fallback route is public", () => {
  assert.equal(notFound.auth, false);
});

test("starts on the fallback, then follows the requests", () => {
  assert.equal(formatRoute(current), "GET /404");
  enter({ method: "POST", path: "/orders", auth: true });
  assert.equal(formatRoute(current), "POST /orders (login required)");
});

test("links to the served paths", () => {
  assert.equal(link("/health"), "https://shop.example.com/health");
});

type _tests = [
  // Only the names in the table are valid route names.
  Expect<Equal<RouteName, "listOrders" | "createOrder" | "health">>,
  // Only the paths in the table are valid links.
  Expect<Equal<ServedPath, "/orders" | "/health">>,
  // The fallback's type knows it's public.
  Expect<Equal<(typeof notFound)["auth"], false>>,
  // `current` can hold any route.
  Expect<Equal<typeof current, Route>>,
];
