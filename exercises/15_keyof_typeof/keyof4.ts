// With `key: keyof T`, the value `record[key]` has type `T[keyof T]`: the
// union of ALL the property types, because TypeScript can't tell which key
// you'll pass. Make the key a type parameter instead, `K extends keyof T`,
// and the value becomes `T[K]`: the type of that one property. The key you
// pass picks the type.
//
// Typed getters and setters, form libraries and state stores all use this
// pattern: it ties a key to the type of its value.
//
// Make `getField` and `setField` precise.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TODO: Return the type of the field named by `key`, not the union of all fields.
function getField<T>(record: T, key: keyof T): T[keyof T] {
  return record[key];
}

// TODO: Only accept a `value` of the right type for `key`.
// Returns a copy, so `record` is never mutated.
function setField<T>(record: T, key: keyof T, value: T[keyof T]): T {
  return { ...record, [key]: value };
}

// Don't change the tests below.

interface SignupForm {
  email: string;
  age: number;
  newsletter: boolean;
}

const form: SignupForm = { email: "ada@example.com", age: 36, newsletter: false };

test("reads a field with its own type", () => {
  const age = getField(form, "age");
  type _test = Expect<Equal<typeof age, number>>;
  assert.equal(age + 1, 37);
});

test("reads another field", () => {
  const email = getField(form, "email");
  type _test = Expect<Equal<typeof email, string>>;
  assert.equal(email.endsWith("@example.com"), true);
});

test("works for any kind of record", () => {
  const product = { sku: "MUG-01", stock: 3 };
  const stock = getField(product, "stock");
  type _test = Expect<Equal<typeof stock, number>>;
  assert.equal(stock - 1, 2);
});

test("sets a field without mutating the record", () => {
  const subscribed = setField(form, "newsletter", true);
  assert.equal(subscribed.newsletter, true);
  assert.equal(form.newsletter, false);
});

// Type tests: each line only compiles when the two types are exactly the same.
// `typeof setField<SignupForm, "age">` is the type of `setField` with its type
// parameters filled in by hand. The value for "age" must be a number.
type _tests = [
  Expect<
    Equal<
      typeof setField<SignupForm, "age">,
      (record: SignupForm, key: "age", value: number) => SignupForm
    >
  >,
];
