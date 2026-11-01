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

type CheckoutForm = {
  email: string;
  quantity: number;
  giftWrap: boolean;
  couponCode?: string;
};

// TODO: One `FieldState` per field of `T`, using that field's own type, and
// required even when the field itself is optional.
type FormState<T> = Record<keyof T, FieldState<unknown>>;

function initialState(values: CheckoutForm): FormState<CheckoutForm> {
  return {
    email: { value: values.email },
    quantity: { value: values.quantity },
    giftWrap: { value: values.giftWrap },
    couponCode: { value: values.couponCode },
  };
}

// Returns the field with `error` set, or without `error` when the value is valid.
function check<V>(field: FieldState<V>, error: string | undefined): FieldState<V> {
  return error === undefined ? { value: field.value } : { value: field.value, error };
}

function validate(state: FormState<CheckoutForm>): FormState<CheckoutForm> {
  const { email, quantity, couponCode } = state;
  return {
    ...state,
    email: check(email, email.value.includes("@") ? undefined : "Enter a valid email"),
    quantity: check(quantity, quantity.value >= 1 ? undefined : "Order at least one item"),
    couponCode: check(
      couponCode,
      couponCode.value === undefined || /^[A-Z0-9]{8}$/.test(couponCode.value)
        ? undefined
        : "Coupon codes are 8 letters or digits",
    ),
  };
}

// Don't change the tests below.

test("valid values have no errors", () => {
  const state = validate(initialState({ email: "ada@example.com", quantity: 2, giftWrap: true }));
  assert.equal(state.email.error, undefined);
  assert.equal(state.quantity.error, undefined);
  assert.equal(state.couponCode.error, undefined);
  assert.equal(state.giftWrap.value, true);
});

test("invalid values get an error message", () => {
  const state = validate(
    initialState({ email: "ada", quantity: 0, giftWrap: false, couponCode: "free" }),
  );
  assert.equal(state.email.error, "Enter a valid email");
  assert.equal(state.quantity.error, "Order at least one item");
  assert.equal(state.couponCode.error, "Coupon codes are 8 letters or digits");
});

type _tests = [
  Expect<
    Equal<
      FormState<CheckoutForm>,
      {
        email: FieldState<string>;
        quantity: FieldState<number>;
        giftWrap: FieldState<boolean>;
        couponCode: FieldState<string | undefined>;
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
