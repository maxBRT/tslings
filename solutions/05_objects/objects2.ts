// A `?` makes a property optional: `phone?: string` means the object may have
// no `phone` at all. With `exactOptionalPropertyTypes` (on in tslings),
// "missing" and "present but `undefined`" are different things, and
// `{ phone: undefined }` is NOT a valid value for `phone?: string`.
//
// The difference is real at runtime: `"phone" in contact`, `Object.keys` and
// spreading over defaults all treat a key set to `undefined` as present. So
// when you have no value, leave the property out instead of setting it.
//
// A signup form gives every field as a string, `""` when left empty. Build a
// contact from it.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface SignupForm {
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface Contact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

function toContact(form: SignupForm): Contact {
  // Spreading `{}` adds nothing, so each optional key only exists when it has
  // a value. The step-by-step alternative works as well:
  //   const contact: Contact = { name: form.name, email: form.email };
  //   if (form.phone !== "") contact.phone = form.phone;
  return {
    name: form.name,
    email: form.email,
    ...(form.phone === "" ? {} : { phone: form.phone }),
    ...(form.company === "" ? {} : { company: form.company }),
  };
}

// Don't change the tests below.

test("keeps the fields that were filled in", () => {
  const form = { name: "Ada", email: "ada@example.com", phone: "+44 20 7946 0000", company: "" };
  assert.deepEqual(toContact(form), {
    name: "Ada",
    email: "ada@example.com",
    phone: "+44 20 7946 0000",
  });
});

test("leaves empty fields out entirely", () => {
  const contact = toContact({ name: "Grace", email: "grace@example.com", phone: "", company: "" });
  assert.deepEqual(Object.keys(contact), ["name", "email"]);
  assert.equal("phone" in contact, false);
});

test("an optional field can be filled without the other", () => {
  const form = { name: "Linus", email: "linus@example.com", phone: "", company: "Kernel Inc" };
  assert.deepEqual(toContact(form), {
    name: "Linus",
    email: "linus@example.com",
    company: "Kernel Inc",
  });
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<Contact, { name: string; email: string; phone?: string; company?: string }>>,
];
