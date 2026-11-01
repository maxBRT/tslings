// There are three ways to give a value a type, and they don't do the same thing:
//
// - `const x: T = value` (annotation): `x` IS a `T` from now on. TypeScript forgets what it
//   knew about this exact value: which keys it has, which literal strings it holds.
// - `value as T` (assertion): "trust me". TypeScript only rejects casts between types that
//   can't overlap at all, so a missing field slips through unnoticed.
// - `value satisfies T`: TypeScript checks that the value fits `T`, and `x` keeps the precise
//   type inferred from the value.
//
// For config objects and lookup tables like this route table, `satisfies` is usually the one.
//
// TODO: Replace the annotation on `routes` and the assertion on `notFound` with `satisfies`,
// then fix the mistake TypeScript finds.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Method = "GET" | "POST" | "DELETE";
type Route = { method: Method; path: string; auth: boolean };

const routes: Record<string, Route> = {
  listOrders: { method: "GET", path: "/orders", auth: true },
  createOrder: { method: "POST", path: "/orders", auth: true },
  health: { method: "GET", path: "/health", auth: false },
};

// What the router serves when no route matches.
const notFound = { method: "GET", path: "/404" } as Route;

type RouteName = keyof typeof routes;

function formatRoute(route: Route): string {
  return `${route.method} ${route.path}${route.auth ? " (login required)" : ""}`;
}

function describeRoute(name: RouteName): string {
  return formatRoute(routes[name]);
}

// Don't change the tests below.

test("describes routes by name", () => {
  assert.equal(describeRoute("createOrder"), "POST /orders (login required)");
  assert.equal(describeRoute("health"), "GET /health");
});

test("the fallback route is public", () => {
  assert.equal(notFound.auth, false);
});

type _tests = [
  // Only the names in the table are valid route names.
  Expect<Equal<RouteName, "listOrders" | "createOrder" | "health">>,
  // Each entry keeps its literal types.
  Expect<Equal<(typeof routes)["health"], { method: "GET"; path: string; auth: false }>>,
  Expect<Equal<typeof notFound, { method: "GET"; path: string; auth: false }>>,
];
