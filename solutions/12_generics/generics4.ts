// Types can have type parameters too. `interface ApiResponse<T>` is a
// template: `ApiResponse<User>` and `ApiResponse<Order[]>` are two types
// made from it. Interfaces and type aliases both take type parameters.
//
// A type parameter can have a default, used when it's left out: with
// `type Result<T, E = Error>`, writing `Result<number>` means
// `Result<number, Error>`.
//
// The two response interfaces below only differ by the type of `data`.
// Replace them with one generic interface, then give `Result` a default.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface User {
  id: string;
  name: string;
}

interface Order {
  id: string;
  totalCents: number;
}

// One interface instead of one per endpoint. An object shape like this can be
// an interface or a type alias; `Result` below has to be a type alias,
// because it is a union.
interface ApiResponse<T> {
  status: number;
  data: T;
  receivedAt: Date;
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

// Defaults go last: a parameter with a default can't come before one without.
type Result<T, E = HttpError> = { ok: true; value: T } | { ok: false; error: E };

// A 2xx response is a success, anything else becomes an HttpError.
function toResult<T>(response: ApiResponse<T>): Result<T> {
  if (response.status >= 200 && response.status < 300) {
    return { ok: true, value: response.data };
  }
  return { ok: false, error: new HttpError(response.status) };
}

// Don't change the tests below.

test("a successful user response", () => {
  const response: ApiResponse<User> = {
    status: 200,
    data: { id: "u1", name: "Ada" },
    receivedAt: new Date(),
  };
  const result = toResult(response);
  type _test = Expect<Equal<typeof result, Result<User, HttpError>>>;
  assert.deepEqual(result, { ok: true, value: { id: "u1", name: "Ada" } });
});

test("a failed order list response", () => {
  const response: ApiResponse<Order[]> = { status: 503, data: [], receivedAt: new Date() };
  const result = toResult(response);
  type _test = Expect<Equal<typeof result, Result<Order[], HttpError>>>;
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.error instanceof HttpError);
    assert.equal(result.error.status, 503);
  }
});

test("the default can be overridden", () => {
  const parsed: Result<number, "not-a-number"> = { ok: false, error: "not-a-number" };
  assert.equal(parsed.ok, false);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  // With one type argument, `Result` uses its default error type.
  Expect<Equal<Result<User>, Result<User, HttpError>>>,
];
