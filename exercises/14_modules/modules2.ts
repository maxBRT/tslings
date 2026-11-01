// A module can export values in two ways.
//
// - Named exports: `export function format() {}`. Import them by their exact name, in braces:
//   `import { format } from "./dates.ts"`. Rename one locally with `as`:
//   `import { format as formatDate } from "./dates.ts"`.
// - One default export: `export default function slugify() {}`. Import it without braces,
//   under any name you like: `import slugify from "./slugify.ts"`.
//
// Here, money.ts and dates.ts both export a function called `format`, and slugify.ts has a
// default export. Open them to check.
//
// TODO: Fix the imports so the code below can call `slugify`, `formatDate` (the `format` from
// dates.ts) and `formatMoney` (the `format` from money.ts). Don't change the two functions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { format } from "./dates.ts";
import { format, money, type Money } from "./money.ts";
import { slugify } from "./slugify.ts";

/** `invoiceFileName("ACME Corp.", someDay)` is `"acme-corp-2026-11-01.pdf"`. */
function invoiceFileName(customer: string, issuedOn: Date): string {
  return `${slugify(customer)}-${formatDate(issuedOn)}.pdf`;
}

function invoiceLine(label: string, amount: Money): string {
  return `${label}: ${formatMoney(amount)}`;
}

// Don't change the tests below.

test("builds the invoice file name", () => {
  const issuedOn = new Date("2026-11-01T15:00:00Z");
  assert.equal(invoiceFileName("ACME Corp.", issuedOn), "acme-corp-2026-11-01.pdf");
  assert.equal(
    invoiceFileName("Café Déjà Vu", new Date("2027-01-31T08:00:00Z")),
    "cafe-deja-vu-2027-01-31.pdf",
  );
});

test("formats an invoice line", () => {
  assert.equal(invoiceLine("Consulting", money(120_000, "USD")), "Consulting: $1,200.00");
  assert.equal(invoiceLine("Hosting", money(4_999, "GBP")), "Hosting: £49.99");
});
