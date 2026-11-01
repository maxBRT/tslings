// To read a property of an `unknown` value, prove two things to TypeScript:
//   1. it's an object: `typeof value === "object" && value !== null`
//      (`typeof null` is "object" too, a famous JavaScript quirk);
//   2. it has the property: `"message" in value`.
// After both checks, `value.message` exists, with type `unknown`, so check its type as well.
//
// When a request fails, every API words its error body differently. Make `errorMessage` find a
// message to show the user in any of these bodies, and fall back to a generic message:
//   { "message": "Invalid email" }
//   { "error": "rate_limited" }
//   { "error": { "message": "Card declined" } }

import { test } from "node:test";
import assert from "node:assert/strict";

const FALLBACK_MESSAGE = "Something went wrong";

function errorMessage(body: unknown): string {
  // TODO: Check that `body` is an object, then that it has each property before reading it.
  if (typeof body.message === "string") {
    return body.message;
  }
  if (body.error !== undefined) {
    // `body.error` is a string, or a nested error body that we read the same way.
    return typeof body.error === "string" ? body.error : errorMessage(body.error);
  }
  return FALLBACK_MESSAGE;
}

// Don't change the tests below.

test("reads a top-level message", () => {
  assert.equal(errorMessage({ message: "Invalid email" }), "Invalid email");
});

test("reads an error string", () => {
  assert.equal(errorMessage({ error: "rate_limited" }), "rate_limited");
});

test("reads a nested error message", () => {
  assert.equal(errorMessage({ error: { message: "Card declined" } }), "Card declined");
});

test("falls back when the body has no usable message", () => {
  assert.equal(errorMessage({ message: 42 }), FALLBACK_MESSAGE);
  assert.equal(errorMessage({ error: { code: 500 } }), FALLBACK_MESSAGE);
  assert.equal(errorMessage({}), FALLBACK_MESSAGE);
});

test("falls back when the body is not an object", () => {
  assert.equal(errorMessage(null), FALLBACK_MESSAGE);
  assert.equal(errorMessage(undefined), FALLBACK_MESSAGE);
  assert.equal(errorMessage("<html>502 Bad Gateway</html>"), FALLBACK_MESSAGE);
  assert.equal(errorMessage(["message"]), FALLBACK_MESSAGE);
});
