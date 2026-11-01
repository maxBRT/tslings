// A mapped type builds an object type by looping over keys, like `for...in` for types:
//
//   type Flags = { [Name in "beta" | "darkMode"]: boolean };
//   // { beta: boolean; darkMode: boolean }
//
// Loop over `keyof T` and you get the same keys as `T`. Inside, `T[K]` is the type of
// the property you're on: keep it, wrap it, or replace it. `Partial<T>` from chapter 16
// is no magic, it's `{ [K in keyof T]?: T[K] }`.
//
// A sign-up form starts empty: each field is `null` until the user fills it in.
// Write `Nullable<T>` so every property keeps its type but may also be `null`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type SignupForm = {
  email: string;
  password: string;
  age: number;
  acceptedTerms: boolean;
};

// TODO: Make this a mapped type over the keys of `T`.
type Nullable<T> = T;

function emptyForm(): Nullable<SignupForm> {
  return { email: null, password: null, age: null, acceptedTerms: null };
}

function missingFields(form: Nullable<SignupForm>): string[] {
  return Object.entries(form)
    .filter(([, value]) => value === null)
    .map(([field]) => field);
}

// Don't change the tests below.

test("a new form has every field missing", () => {
  assert.deepEqual(missingFields(emptyForm()), ["email", "password", "age", "acceptedTerms"]);
});

test("filled fields are no longer missing", () => {
  const form = { ...emptyForm(), email: "ada@example.com", acceptedTerms: true };
  assert.deepEqual(missingFields(form), ["password", "age"]);
});

// `Expect<Equal<A, B>>` only compiles when `A` and `B` are exactly the same type.
type _tests = [
  Expect<
    Equal<
      Nullable<SignupForm>,
      {
        email: string | null;
        password: string | null;
        age: number | null;
        acceptedTerms: boolean | null;
      }
    >
  >,
  // `Nullable` works for any object type, not just this form.
  Expect<
    Equal<Nullable<{ id: number; tags: string[] }>, { id: number | null; tags: string[] | null }>
  >,
];
