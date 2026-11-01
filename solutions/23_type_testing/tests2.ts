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
// keeps its literal types instead of widening to `string`. Storing the result of `JSON.parse`
// in an `unknown` stops its `any` at the source, as in chapter 10. The file may hold `null` or
// a number, so `raw` is narrowed to an object first; each field stays `unknown` until checked.
function parseDeploySettings(json: string): DeploySettings {
  const raw: unknown = JSON.parse(json);
  const fields: { region?: unknown; replicas?: unknown; tags?: unknown } =
    typeof raw === "object" && raw !== null ? raw : {};
  return {
    region: fields.region === "us" ? "us-east-1" : "eu-west-1",
    replicas: Number(fields.replicas ?? 1),
    // `filter` infers the type predicate `tag is string` from the callback (TypeScript 5.5),
    // so the result is a `string[]`, not an `any[]`.
    tags: Array.isArray(fields.tags)
      ? fields.tags.filter((tag: unknown) => typeof tag === "string")
      : [],
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

test("an empty config file gets the defaults", () => {
  const defaults = { region: "eu-west-1", replicas: 1, tags: [] };
  assert.deepEqual(parseDeploySettings("{}"), defaults);
  assert.deepEqual(parseDeploySettings("null"), defaults);
});

// One type test per comment in `_tests`.
type _count = Expect<Equal<_tests["length"], 3>>;

// The whole spec in one check. When it fails, it can't tell you which field is wrong: one test
// per field can, and that's why `_tests` has one.
type _spec = Expect<Equal<Settings, { region: Region; replicas: number; tags: string[] }>>;
