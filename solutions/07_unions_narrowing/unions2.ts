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
  // `=== undefined` and not `if (!header)`: a truthiness check would also treat
  // the empty string as "missing".
  if (header === undefined) {
    return undefined;
  }
  // Here `header` is `string | string[]`.
  if (Array.isArray(header)) {
    const [first, ...others] = header;
    if (others.some((other) => other !== first)) {
      throw new Error(`Conflicting Content-Length values: ${header.join(", ")}`);
    }
    // `first` is `string | undefined` (the array could be empty), which is
    // exactly what this function accepts, so it can validate it for us.
    return contentLength(first);
  }
  // Both other cases have returned: `header` is a `string` here.

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
