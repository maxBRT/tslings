// Runtime tests can't see types. If a function starts returning `any`, or a field widens from
// `"us-east-1" | "eu-west-1"` to `string`, every runtime test still passes, and the bug shows
// up later, in code that trusted the type. Type tests pin types down:
//
//   type _tests = [Expect<Equal<Actual, Expected>>];
//
// `Equal<A, B>` is `true` only when A and B are exactly the same type, and `Expect` stops the
// file from compiling when it gets `false`. "Exactly" matters. A check like
// `const region: string = settings.region` also passes when `region` is `any`; `Equal` doesn't.
//
// TODO: Write the two missing type tests in `_tests`. When one fails, the bug is in
// `parseDeploySettings`, not in your test: fix the function.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Region = "us-east-1" | "eu-west-1";

// Reads the deploy settings from a JSON config file.
function parseDeploySettings(json: string) {
  const raw = JSON.parse(json);
  return {
    region: raw.region === "us" ? "us-east-1" : "eu-west-1",
    replicas: Number(raw.replicas ?? 1),
    tags: raw.tags,
  };
}

type Settings = ReturnType<typeof parseDeploySettings>;

type _tests = [
  // `replicas` is a number.
  Expect<Equal<Settings["replicas"], number>>,
  // TODO: `region` is a `Region`.
  // TODO: `tags` is a `string[]`.
];

// Don't change the tests below.

test("reads the region and the replica count", () => {
  const settings = parseDeploySettings('{ "region": "us", "replicas": 3 }');
  assert.equal(settings.region, "us-east-1");
  assert.equal(settings.replicas, 3);
});

test("keeps only the tags that are strings", () => {
  const settings = parseDeploySettings('{ "tags": ["web", 42, "canary"] }');
  assert.deepEqual(settings.tags, ["web", "canary"]);
  assert.deepEqual(parseDeploySettings("{}").tags, []);
});

// One type test per comment in `_tests`.
type _count = Expect<Equal<_tests["length"], 3>>;

// The whole spec in one check. When it fails, it can't tell you which field is wrong: one test
// per field can, and that's why `_tests` has one.
type _spec = Expect<Equal<Settings, { region: Region; replicas: number; tags: string[] }>>;
