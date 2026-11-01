// Database clients like Supabase answer with `{ data, error }`, where exactly
// one of the two is `null`. The type says so with two members, and `error`
// acts as the discriminant. Once `error` is known to be `null`, `data` can't be.
//
// You can destructure such a union and still narrow it (TypeScript 4.6+).
// TypeScript remembers that `data` and `error` came out of the same object,
// so checking one narrows the other. That only works when they come from a
// single destructuring with `const`, or from a destructured parameter.
// `const data = result.data;` on its own line is just an unrelated variable.
//
// Fix `invoiceTitle`, then write `unwrapInvoice`.

import { test } from "node:test";
import assert from "node:assert/strict";

type DbError = { code: string; message: string };
type Invoice = { id: string; customer: string; totalCents: number };

type InvoiceResult = { data: Invoice; error: null } | { data: null; error: DbError };

function invoiceTitle(result: InvoiceResult): string {
  // One destructuring, so TypeScript keeps `data` and `error` linked.
  // (With `let` it wouldn't: either variable could be reassigned later.)
  const { data, error } = result;
  if (error !== null) {
    return `Invoice unavailable (${error.code})`;
  }
  return `Invoice ${data.id} for ${data.customer}`;
}

function unwrapInvoice({ data, error }: InvoiceResult): Invoice {
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

// Don't change the tests below.

const found: InvoiceResult = {
  data: { id: "INV-0042", customer: "Initech", totalCents: 129_900 },
  error: null,
};
const failed: InvoiceResult = {
  data: null,
  error: { code: "08006", message: "connection refused" },
};

test("title of a loaded invoice", () => {
  assert.equal(invoiceTitle(found), "Invoice INV-0042 for Initech");
});

test("title when the query failed", () => {
  assert.equal(invoiceTitle(failed), "Invoice unavailable (08006)");
});

test("unwrap returns the invoice", () => {
  assert.deepEqual(unwrapInvoice(found), {
    id: "INV-0042",
    customer: "Initech",
    totalCents: 129_900,
  });
});

test("unwrap throws the database error", () => {
  assert.throws(() => unwrapInvoice(failed), { message: "connection refused" });
});
