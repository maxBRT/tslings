// Narrowing follows the flow of your code. After
// `if (header === undefined) return ...;`, TypeScript removes `undefined` from
// `header`'s type for every line below, and a branch that `throw`s works the
// same way. TypeScript developers use these guard clauses at the top of a
// function to peel a union down to the one case the main code handles.
//
// A raw HTTP header value is often typed `string | string[] | undefined`
// (missing, sent once, or sent several times). `typeof` says "object" for
// arrays, so test for them with `Array.isArray(header)`.
//
// Add guard clauses so that the regex test at the bottom only sees a string.

import { test } from "node:test";
import assert from "node:assert/strict";

function contentLength(header: string | string[] | undefined): number | undefined {
  // TODO: Add guard clauses here.
  //   - No header: return `undefined` (the body has no declared length).
  //     An empty string is NOT missing: it's an invalid value.
  //   - Several values: proxies sometimes repeat the header, which is fine
  //     when every copy agrees (`["12", "12"]` means 12). Throw an Error when
  //     they disagree.

  if (!/^\d+$/.test(header)) {
    throw new RangeError(`Invalid Content-Length: "${header}"`);
  }
  return Number(header);
}

// Don't change the tests below.

test("a missing header has no length", () => {
  assert.equal(contentLength(undefined), undefined);
});

test("a single value", () => {
  assert.equal(contentLength("348"), 348);
  assert.equal(contentLength("0"), 0);
});

test("invalid values are rejected", () => {
  assert.throws(() => contentLength("12abc"), RangeError);
  assert.throws(() => contentLength("-1"), RangeError);
});

test("an empty header is invalid, not missing", () => {
  assert.throws(() => contentLength(""), RangeError);
});

test("repeated values that agree", () => {
  assert.equal(contentLength(["12", "12"]), 12);
  assert.equal(contentLength(["7"]), 7);
});

test("repeated values that disagree", () => {
  assert.throws(() => contentLength(["12", "13"]), Error);
});
