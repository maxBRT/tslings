// "Parameter properties" are a TypeScript shorthand: `constructor(private token: string) {}`
// declares a field AND assigns it. You'll see them a lot in NestJS and Angular code, but they
// aren't JavaScript with the types removed: TypeScript has to generate the assignment. Node
// runs TypeScript by erasing types only, so it rejects them (`erasableSyntaxOnly`).
//
// Also, `private` is only checked by the compiler. At runtime the field is an ordinary
// property: `JSON.stringify`, `Object.keys` and `console.log` all see it. JavaScript's own
// `#private` fields are really hidden, so modern TypeScript code prefers them.
//
// Rewrite `ApiClient` with explicit fields, and make sure the token never leaks.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

class ApiClient {
  readonly baseUrl: string;
  // `#token` is part of the name: you read it with `this.#token`. Code outside the class
  // can't read it at all, not even with `client["#token"]`.
  readonly #token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.#token = token;
  }

  url(path: string): string {
    return new URL(path, this.baseUrl).href;
  }

  headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.#token}`, Accept: "application/json" };
  }
}

// Don't change the tests below.

const client = new ApiClient("https://api.example.com", "s3cr3t-t0ken");

test("builds URLs", () => {
  assert.equal(client.url("/v1/invoices"), "https://api.example.com/v1/invoices");
});

test("sends the token", () => {
  assert.deepEqual(client.headers(), {
    Authorization: "Bearer s3cr3t-t0ken",
    Accept: "application/json",
  });
});

test("the token never shows up when the client is logged or serialized", () => {
  assert.equal(JSON.stringify(client), '{"baseUrl":"https://api.example.com"}');
  assert.deepEqual(Object.keys(client), ["baseUrl"]);
  assert.ok(!("token" in client));
});

type _tests = [Expect<Equal<Pick<ApiClient, "baseUrl">, { readonly baseUrl: string }>>];
