// `keyof T` is the union of T's property names. Combined with `typeof`,
// `keyof typeof obj` gives the keys of an object VALUE, as a union of string
// literals. When someone adds a key to the object, the union grows with it.
//
// Indexing an object with a plain `string` doesn't compile: most strings
// aren't keys of that object, and with `noImplicitAny` TypeScript won't guess.
// Typing the key with `keyof` proves the lookup can't miss.
//
// Derive `Locale` and `MessageKey` from `MESSAGES`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

const MESSAGES = {
  en: { greeting: "Hello", farewell: "Goodbye", cartEmpty: "Your cart is empty" },
  fr: { greeting: "Bonjour", farewell: "Au revoir", cartEmpty: "Votre panier est vide" },
};

// TODO: The locales MESSAGES has: "en" | "fr".
type Locale = string;

// TODO: The message keys of one locale (every locale has the same keys).
type MessageKey = string;

function translate(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}

// Don't change the tests below.

test("translates into English", () => {
  assert.equal(translate("en", "greeting"), "Hello");
});

test("translates into French", () => {
  assert.equal(translate("fr", "cartEmpty"), "Votre panier est vide");
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<Locale, "en" | "fr">>,
  Expect<Equal<MessageKey, "greeting" | "farewell" | "cartEmpty">>,
];
