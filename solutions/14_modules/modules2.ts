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

import { test } from "node:test";
import assert from "node:assert/strict";
// Another option is a namespace import, `import * as dates from "./dates.ts"`, and then
// `dates.format(...)`: the module name tells the reader which `format` it is.
import { format as formatDate } from "./dates.ts";
import { format as formatMoney, money, type Money } from "./money.ts";
// The name of a default import is up to the importer: `import makeSlug from ...` would work
// just as well, which is why teams often prefer named exports for their own modules.
import slugify from "./slugify.ts";

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
