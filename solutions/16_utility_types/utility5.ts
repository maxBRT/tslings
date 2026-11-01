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

// Without any type, the table would compile only partly: `user` would be an
// implicit `any`, and `owner` would widen to `string`. With `satisfies`,
// every flag is checked, `user` is typed from `Flag`, and the keys stay.
// When the keys come from a union you already have (`type FlagKey = ...`),
// `satisfies Record<FlagKey, Flag>` also checks that no flag is missing.
// One thing to know: each entry keeps its OWN type. `FLAGS.darkMode.isEnabledFor`
// is `() => true`, so calling it directly with a user doesn't compile; code
// that goes through `Flag`, like `isEnabled` in the tests, is unaffected.
const FLAGS = {
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
} satisfies Record<string, Flag>;

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
