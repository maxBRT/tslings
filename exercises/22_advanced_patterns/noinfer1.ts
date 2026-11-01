// TypeScript infers a type parameter from every argument that mentions it. Usually that's what
// you want, but not always. Here `Variant` should come from the list of variants only, and the
// fallback should be checked against that list. Because `fallback` also has type `Variant`,
// TypeScript infers from it too, and a typo in the fallback quietly becomes one more variant.
//
// `NoInfer<T>` (TypeScript 5.4) marks a spot that must not be used to infer `T`. The parameter
// still has type `T`; TypeScript just works `T` out from the other arguments, then checks this
// one against it.
//
// TODO: Stop `fallback` from adding to `Variant`, then fix the typo TypeScript finds.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Experiment<Variant extends string> = {
  readonly name: string;
  readonly variants: readonly Variant[];
  // Served when a user can't be assigned to a variant.
  readonly fallback: Variant;
};

function defineExperiment<Variant extends string>(
  name: string,
  variants: readonly Variant[],
  fallback: Variant,
): Experiment<Variant> {
  return { name, variants, fallback };
}

// Picks the same variant for the same user every time.
function assignVariant<Variant extends string>(
  experiment: Experiment<Variant>,
  userId: string,
): Variant {
  if (userId === "") return experiment.fallback;
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  return experiment.variants[hash % experiment.variants.length] ?? experiment.fallback;
}

// Users who can't be assigned see the current checkout, "control".
const checkout = defineExperiment(
  "checkout-redesign",
  ["control", "one-page", "express"],
  "contol",
);

// Don't change the tests below.

test("anonymous users get the fallback variant", () => {
  assert.equal(assignVariant(checkout, ""), "control");
});

test("a user always gets the same variant", () => {
  const variant = assignVariant(checkout, "usr_ada");
  assert.ok(checkout.variants.includes(variant));
  assert.equal(assignVariant(checkout, "usr_ada"), variant);
});

// `Accepts<Args>` is `true` when `defineExperiment(...args)` compiles with arguments of
// these types.
type Accepts<Args extends unknown[]> =
  typeof defineExperiment extends (...args: Args) => unknown ? true : false;

type _tests = [
  Expect<Equal<typeof checkout, Experiment<"control" | "one-page" | "express">>>,
  // A fallback that isn't one of the variants doesn't compile...
  Expect<Equal<Accepts<[name: string, variants: readonly ("a" | "b")[], fallback: "c"]>, false>>,
  // ...but one that is still does.
  Expect<Equal<Accepts<[name: string, variants: readonly ("a" | "b")[], fallback: "a"]>, true>>,
];
