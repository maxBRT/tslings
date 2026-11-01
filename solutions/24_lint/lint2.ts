// `eqeqeq` flags `==` and `!=`. Both convert their operands before comparing, with rules few
// people remember: `0 == ""` is true, `false == "0"` is true, `null == 0` is false. TypeScript
// already rejects `==` between types that never overlap, like a `number` and a `string`. It
// can't help between members of one union, like `string | number`, and that's exactly where the
// conversions bite. `===` and `!==` compare without converting anything.
//
// The rule has one exception: `x == null` is true for both `null` and `undefined`, a common
// shorthand that the rule allows.

import { test } from "node:test";
import assert from "node:assert/strict";

type FieldValue = string | number | boolean | null;
type FormValues = Readonly<Record<string, FieldValue>>;

// The fields the user changed, so that the form only sends those to the API.
// With `!=`, `0 != ""` is false: clearing a field that showed 0 didn't count as a change.
function changedFields(initial: FormValues, current: FormValues): string[] {
  return Object.keys(current).filter((name) => current[name] !== initial[name]);
}

// How a value appears in the "review your changes" dialog.
function display(value: FieldValue | undefined): string {
  // Allowed: `== null` is the one loose comparison that's clearer than its strict version
  // (`value === null || value === undefined`).
  if (value == null) return "(empty)";
  // `typeof` always returns a string, so `==` was harmless here. The rule still asks for `===`
  // everywhere, so nobody has to stop and work out which `==` are safe.
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

// Don't change the tests below.

test("unchanged fields are not sent", () => {
  const values = { quantity: 2, giftWrap: false, coupon: null };
  assert.deepEqual(changedFields(values, { ...values }), []);
});

test("clearing a field is a change", () => {
  assert.deepEqual(changedFields({ quantity: 0, note: "" }, { quantity: "", note: "" }), [
    "quantity",
  ]);
});

test("typing 0 in an empty field is a change", () => {
  assert.deepEqual(changedFields({ quantity: "" }, { quantity: 0 }), ["quantity"]);
});

test("a value that changed type is a change", () => {
  assert.deepEqual(changedFields({ quantity: 1 }, { quantity: "1" }), ["quantity"]);
});

test("display", () => {
  assert.equal(display(null), "(empty)");
  assert.equal(display(undefined), "(empty)");
  assert.equal(display(true), "yes");
  assert.equal(display(0), "0");
});
