// An annotation, `const x: T = value`, checks the value against `T` and then
// FORGETS the value: from then on, `x` is just a `T`. Annotate a table with
// `Record<string, Flag>`, and TypeScript no longer knows which flags exist,
// so every lookup might be `undefined`.
//
// `value satisfies T` (TypeScript 4.9) checks the value against `T` just as
// strictly, typos and missing fields included, but keeps the value's own,
// more precise type. Like an annotation, it also types the callbacks inside.
//
// Keep the feature flag table checked, without losing what it contains.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Team = "growth" | "payments" | "platform";

interface User {
  id: string;
  plan: "free" | "pro";
  betaTester: boolean;
}

interface Flag {
  owner: Team;
  description: string;
  isEnabledFor: (user: User | undefined) => boolean;
}

// TODO: Check this table against `Record<string, Flag>` without forgetting
// its keys and values.
const FLAGS: Record<string, Flag> = {
  darkMode: {
    owner: "platform",
    description: "Dark color theme",
    isEnabledFor: () => true,
  },
  newCheckout: {
    owner: "payments",
    description: "One-page checkout",
    isEnabledFor: (user) => user?.betaTester === true,
  },
  invoiceExport: {
    owner: "growth",
    description: "Export invoices as CSV",
    isEnabledFor: (user) => user?.plan === "pro",
  },
};

type FlagName = keyof typeof FLAGS;

function describeFlag(name: FlagName): string {
  const flag = FLAGS[name];
  return `${name}: ${flag.description} (owned by ${flag.owner})`;
}

// Don't change the tests below.

test("describes a flag", () => {
  assert.equal(describeFlag("newCheckout"), "newCheckout: One-page checkout (owned by payments)");
  assert.equal(describeFlag("darkMode"), "darkMode: Dark color theme (owned by platform)");
});

// Asks a flag the way the app does: through the `Flag` type.
const isEnabled = (flag: Flag, user: User | undefined): boolean => flag.isEnabledFor(user);

test("decides who sees each feature", () => {
  const tester: User = { id: "u1", plan: "free", betaTester: true };
  const customer: User = { id: "u2", plan: "pro", betaTester: false };
  assert.equal(isEnabled(FLAGS.newCheckout, tester), true);
  assert.equal(isEnabled(FLAGS.newCheckout, customer), false);
  assert.equal(isEnabled(FLAGS.invoiceExport, customer), true);
  assert.equal(isEnabled(FLAGS.invoiceExport, undefined), false);
  assert.equal(isEnabled(FLAGS.darkMode, undefined), true);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<FlagName, "darkMode" | "newCheckout" | "invoiceExport">>,
  // `satisfies` keeps literal types wherever `Flag` allows them.
  Expect<Equal<(typeof FLAGS)["newCheckout"]["owner"], "payments">>,
];
