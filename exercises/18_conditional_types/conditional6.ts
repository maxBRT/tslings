// Validation libraries like Zod, Valibot or ArkType turn the checks of chapter 10 into data. You
// describe the shape once, as a schema VALUE, and get both a runtime check and the static type,
// with `z.infer<typeof UserSchema>`: no hand-written type to keep in sync with the checks.
// Under the hood, that type is a mapped type over the schema whose values are conditional types.
//
// Here a schema maps each field to the name of its type. Write `Infer<S>`, then make `matches` a
// type guard, so that TypeScript knows what it checked.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type FieldKind = "string" | "number" | "boolean";
type Schema = { readonly [field: string]: FieldKind };

// TODO: For each field of `S`, the type its kind names: `"string"` gives `string`, and so on.
type Infer<S extends Schema> = unknown;

// TODO: When `matches` returns `true`, `value` is an `Infer<S>`.
function matches<S extends Schema>(schema: S, value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const fields = new Map<string, unknown>(Object.entries(value));
  return Object.entries(schema).every(([field, kind]) => typeof fields.get(field) === kind);
}

// `satisfies` checks the schema and keeps each kind as a literal type, because `FieldKind` is a
// union of literals.
const SignupSchema = {
  email: "string",
  age: "number",
  newsletter: "boolean",
} satisfies Schema;

type Signup = Infer<typeof SignupSchema>;

function welcome(body: unknown): string {
  if (!matches(SignupSchema, body)) return "Invalid sign-up";
  return `Welcome, ${body.email.toLowerCase()}${body.newsletter ? " (subscribed)" : ""}`;
}

// Don't change the tests below.

test("accepts a body that fits the schema", () => {
  const body: unknown = JSON.parse('{"email":"Ada@Example.com","age":36,"newsletter":true}');
  assert.equal(welcome(body), "Welcome, ada@example.com (subscribed)");
});

test("rejects a body that doesn't", () => {
  const ada = { email: "ada@example.com", age: 36, newsletter: true };
  assert.equal(welcome({ ...ada, age: "36" }), "Invalid sign-up");
  assert.equal(welcome({ email: ada.email, age: ada.age }), "Invalid sign-up");
  assert.equal(welcome(null), "Invalid sign-up");
});

test("works with any schema", () => {
  const ProductSchema = { sku: "string", inStock: "boolean" } satisfies Schema;
  const body: unknown = { sku: "mug-01", inStock: true };
  if (!matches(ProductSchema, body)) assert.fail("expected a valid product");
  type _test = Expect<Equal<typeof body, { sku: string; inStock: boolean }>>;
  assert.equal(body.sku, "mug-01");
});

type _tests = [
  Expect<Equal<Signup, { email: string; age: number; newsletter: boolean }>>,
  Expect<Equal<Infer<{ id: "number"; name: "string" }>, { id: number; name: string }>>,
];
