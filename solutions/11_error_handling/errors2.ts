// A custom error class carries the details callers need to decide what to do, like the HTTP
// status of a failed request. It extends `Error`, so it keeps a message and a stack trace,
// and `instanceof HttpError` narrows a caught `unknown` to it, with all its fields.
//
// Two conventions: give the class a `name` (stack traces and logs print it), and only catch
// what you know how to handle. Rethrow everything else, so real bugs aren't swallowed.
//
// Finish `HttpError`, then make `avatarUrl` fall back to a default avatar on 404 only.
// (Classes get a whole chapter later. For now: a field is declared in the class body, and set
// in the constructor with `this.field = ...` after calling `super(...)`.)

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

class HttpError extends Error {
  // `Error` already has a `name`, so redeclaring it needs `override` (`noImplicitOverride`).
  // With `readonly`, its type is the literal "HttpError" rather than `string`.
  override readonly name = "HttpError";
  readonly status: number;

  constructor(status: number, url: string) {
    super(`GET ${url} failed with status ${status}`);
    this.status = status;
  }
}

const DEFAULT_AVATAR = "https://cdn.example.com/avatars/default.png";

// Stands in for a real HTTP call. The tests pass fake ones.
type Get = (url: string) => string;

function avatarUrl(get: Get, userId: string): string {
  try {
    return get(`/users/${userId}/avatar`);
  } catch (error) {
    // `instanceof` checks the class, not the shape: a plain `{ status: 404 }` object, or
    // another library's error that happens to have a `status`, is rethrown.
    if (error instanceof HttpError && error.status === 404) {
      return DEFAULT_AVATAR;
    }
    throw error;
  }
}

// Don't change the tests below.

test("HttpError is an Error with a status", () => {
  const error = new HttpError(503, "/users/1/avatar");
  assert.ok(error instanceof Error);
  assert.equal(error.name, "HttpError");
  assert.equal(error.status, 503);
  assert.equal(error.message, "GET /users/1/avatar failed with status 503");
  assert.match(String(error), /^HttpError: GET/);
});

test("returns the avatar when there is one", () => {
  const get: Get = (url) => `https://cdn.example.com${url}.png`;
  assert.equal(avatarUrl(get, "42"), "https://cdn.example.com/users/42/avatar.png");
});

test("falls back to the default avatar on 404", () => {
  const get: Get = (url) => {
    throw new HttpError(404, url);
  };
  assert.equal(avatarUrl(get, "7"), DEFAULT_AVATAR);
});

test("rethrows other HTTP errors", () => {
  const get: Get = (url) => {
    throw new HttpError(500, url);
  };
  assert.throws(() => avatarUrl(get, "7"), { name: "HttpError", status: 500 });
});

test("rethrows errors that are not HTTP errors", () => {
  const get: Get = () => {
    throw new TypeError("fetch failed");
  };
  assert.throws(() => avatarUrl(get, "7"), TypeError);

  const notAnError: Get = () => {
    throw { status: 404 };
  };
  assert.throws(() => avatarUrl(notAnError, "7"), { status: 404 });

  // Another library's error, with a `status` of its own: not one of our HTTP errors.
  const storageError: Get = () => {
    throw Object.assign(new Error("bucket not found"), { status: 404 });
  };
  assert.throws(() => avatarUrl(storageError, "7"), /bucket not found/);
});

type _tests = [Expect<Equal<Pick<HttpError, "status">, { readonly status: number }>>];
