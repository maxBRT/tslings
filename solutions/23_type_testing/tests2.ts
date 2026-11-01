// Runtime tests can't see types. If a function starts returning `any`, or a field widens from
// `"us-east-1" | "eu-west-1"` to `string`, every runtime test still passes, and the bug shows
// up later, in code that trusted the type. Type tests pin types down:
//
//   type _tests = [Expect<Equal<Actual, Expected>>];
//
// `Equal<A, B>` is `true` only when A and B are exactly the same type, and `Expect` stops the
// file from compiling when it gets `false`. "Exactly" matters. A check like
// `const region: string = settings.region` also passes when `region` is `any`; `Equal` doesn't.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Region = "us-east-1" | "eu-west-1";

type DeploySettings = { region: Region; replicas: number; tags: string[] };

// Reads the deploy settings from a JSON config file.
//
// The return type annotation is a contract: every field is checked against it, and the ternary
// keeps its literal types instead of widening to `string`. Annotating `raw` with `unknown`
// fields stops `any` from flowing out of `JSON.parse`: each value has to be checked before use.
// (The annotation still trusts the file to hold an object; a `typeof raw === "object"` check
// would close that gap too.)
function parseDeploySettings(json: string): DeploySettings {
  const raw: { region?: unknown; replicas?: unknown; tags?: unknown } = JSON.parse(json);
  return {
    region: raw.region === "us" ? "us-east-1" : "eu-west-1",
    replicas: Number(raw.replicas ?? 1),
    // `filter` infers the type predicate `tag is string` from the callback (TypeScript 5.5),
    // so the result is a `string[]`, not an `any[]`.
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag: unknown) => typeof tag === "string") : [],
  };
}

type Settings = ReturnType<typeof parseDeploySettings>;

type _tests = [
  // `replicas` is a number.
  Expect<Equal<Settings["replicas"], number>>,
  // `region` is a `Region`.
  Expect<Equal<Settings["region"], Region>>,
  // `tags` is a `string[]`.
  Expect<Equal<Settings["tags"], string[]>>,
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
