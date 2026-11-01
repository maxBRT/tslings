// Mapped types let one type be the single source of truth for a whole family of types.
// Form libraries (React Hook Form, TanStack Form...) work like this: from the type of
// the form's values they derive the state of each field, the errors, the touched flags.
// Add a field to the form, and every derived type follows.
//
// Write `FormState<T>`: for every field of `T`, a `FieldState` holding a value of that
// field's own type. Every field needs a state, the optional ones too, so the code can
// read any field's state without checking that it exists.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type FieldState<V> = { value: V; error?: string };

// The sign-up form of a conference.
type RegistrationForm = {
  email: string;
  seats: number;
  needsParking: boolean;
  badgeName?: string; // the name to print on the badge, if the attendee wants one
};

// TODO: One `FieldState` per field of `T`, using that field's own type, and
// required even when the field itself is optional.
type FormState<T> = Record<keyof T, FieldState<unknown>>;

function initialState(values: RegistrationForm): FormState<RegistrationForm> {
  return {
    email: { value: values.email },
    seats: { value: values.seats },
    needsParking: { value: values.needsParking },
    badgeName: { value: values.badgeName },
  };
}

// Returns the field with `error` set, or without `error` when the value is valid.
function check<V>(field: FieldState<V>, error: string | undefined): FieldState<V> {
  return error === undefined ? { value: field.value } : { value: field.value, error };
}

function validate(state: FormState<RegistrationForm>): FormState<RegistrationForm> {
  const { email, seats, badgeName } = state;
  return {
    ...state,
    email: check(email, email.value.includes("@") ? undefined : "Enter a valid email"),
    seats: check(seats, seats.value >= 1 ? undefined : "Book at least one seat"),
    badgeName: check(
      badgeName,
      badgeName.value === undefined || /^[\p{L} -]{1,20}$/u.test(badgeName.value)
        ? undefined
        : "Badge names are up to 20 letters, spaces or hyphens",
    ),
  };
}

// Don't change the tests below.

test("valid values have no errors", () => {
  const state = validate(initialState({ email: "ada@example.com", seats: 2, needsParking: true }));
  assert.equal(state.email.error, undefined);
  assert.equal(state.seats.error, undefined);
  assert.equal(state.badgeName.error, undefined);
  assert.equal(state.needsParking.value, true);
});

test("invalid values get an error message", () => {
  const state = validate(
    initialState({
      email: "ada",
      seats: 0,
      needsParking: false,
      badgeName: "Augusta Ada King, Countess of Lovelace",
    }),
  );
  assert.equal(state.email.error, "Enter a valid email");
  assert.equal(state.seats.error, "Book at least one seat");
  assert.equal(state.badgeName.error, "Badge names are up to 20 letters, spaces or hyphens");
});

type _tests = [
  Expect<
    Equal<
      FormState<RegistrationForm>,
      {
        email: FieldState<string>;
        seats: FieldState<number>;
        needsParking: FieldState<boolean>;
        badgeName: FieldState<string | undefined>;
      }
    >
  >,
  Expect<
    Equal<
      FormState<{ name: string; nickname?: string }>,
      { name: FieldState<string>; nickname: FieldState<string | undefined> }
    >
  >,
];
