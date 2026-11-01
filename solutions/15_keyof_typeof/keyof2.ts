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

// `keyof` needs a type, so `typeof` turns the value into one first.
// Read it inside out: `keyof (typeof MESSAGES)`.
type Locale = keyof typeof MESSAGES;

// `typeof` also accepts a property path. English is the reference locale here;
// `keyof (typeof MESSAGES)["en"]` (an indexed access type) means the same.
type MessageKey = keyof typeof MESSAGES.en;

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
