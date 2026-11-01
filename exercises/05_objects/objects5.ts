// Some objects are dictionaries: their keys are data, not a fixed list of
// properties. Two ways to write their type, which mean the same thing:
//
//   { [flag: string]: boolean }   // an index signature
//   Record<string, boolean>       // the built-in `Record<Keys, Value>` type
//
// With `string` keys, any key may be missing, so (with `noUncheckedIndexedAccess`)
// reading one gives `boolean | undefined`. When the keys are a known union
// instead, `Record<"en" | "fr", string>` requires every one of them, and reading
// one is always safe.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Locale = "en" | "fr" | "es";

// TODO: Every locale needs a greeting. Change the type so that TypeScript
// checks that, then add the greeting it reports as missing: "Bienvenido".
const GREETINGS: { [locale: string]: string } = {
  en: "Welcome",
  fr: "Bienvenue",
};

function greeting(locale: Locale): string {
  return GREETINGS[locale];
}

// Feature flags from a remote config service. Any flag can be missing.
type FeatureFlags = Record<string, boolean>;

function isEnabled(flags: FeatureFlags, name: string): boolean {
  // TODO: A flag that isn't in the config is off.
  return flags[name];
}

// Don't change the tests below.

test("a greeting for every locale", () => {
  assert.equal(greeting("en"), "Welcome");
  assert.equal(greeting("fr"), "Bienvenue");
  assert.equal(greeting("es"), "Bienvenido");
});

test("feature flags", () => {
  const flags: FeatureFlags = { darkMode: true, betaCheckout: false };
  assert.equal(isEnabled(flags, "darkMode"), true);
  assert.equal(isEnabled(flags, "betaCheckout"), false);
  assert.equal(isEnabled(flags, "newEditor"), false);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<typeof GREETINGS, Record<Locale, string>>>,
  Expect<Equal<Locale, "en" | "fr" | "es">>,
];
