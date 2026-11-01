// Template literal types can be recursive too. Translation libraries (i18next,
// next-intl...) use one to turn a nested dictionary of messages into the union of its
// dotted paths. `t("checkout.pay")` then autocompletes in the editor, and a typo like
// `t("checkout.pya")` fails to compile instead of showing a raw key to users.
//
// Write `MessageKey<T>`: every path from the top of `T` down to a string, with the keys
// joined by dots. For each key `K` of `T`:
// - if `T[K]` is a string, the path is just `K`,
// - otherwise, it's `K`, a dot, and each path inside `T[K]`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type MessageTree = { readonly [key: string]: string | MessageTree };

const messages = {
  logout: "Log out",
  checkout: {
    title: "Checkout",
    pay: "Pay now",
    errors: { declined: "Your card was declined", expired: "Your card has expired" },
  },
  profile: { title: "Your profile" },
} as const satisfies MessageTree;

// A pattern for building a union key by key: a mapped type computes one answer per key, then
// indexing it with its own keys reads every answer at once. Without recursion, it looks like:
//
//   type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];
//   // StringKeys<{ id: string; age: number; name: string }> is "id" | "name"
//
// TODO: The union of every dotted path to a message in `T`.
type MessageKey<T> = keyof T & string;

// "checkout.errors.declined" -> "Your card was declined", built once at startup.
function flatten(tree: MessageTree, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") {
      result.set(path, value);
    } else {
      for (const [nestedPath, message] of flatten(value, path)) result.set(nestedPath, message);
    }
  }
  return result;
}

const lookup = flatten(messages);

function t(key: MessageKey<typeof messages>): string {
  return lookup.get(key) ?? key;
}

function paymentError(reason: "declined" | "expired"): string {
  return t(`checkout.errors.${reason}`);
}

// Don't change the tests below.

test("top-level and nested messages", () => {
  assert.equal(t("logout"), "Log out");
  assert.equal(t("checkout.pay"), "Pay now");
  assert.equal(t("profile.title"), "Your profile");
});

test("keys built from a template", () => {
  assert.equal(paymentError("expired"), "Your card has expired");
});

type _tests = [
  Expect<
    Equal<
      MessageKey<typeof messages>,
      | "logout"
      | "checkout.title"
      | "checkout.pay"
      | "checkout.errors.declined"
      | "checkout.errors.expired"
      | "profile.title"
    >
  >,
  Expect<Equal<MessageKey<{ a: { b: { c: "deep" } }; d: "flat" }>, "a.b.c" | "d">>,
];
