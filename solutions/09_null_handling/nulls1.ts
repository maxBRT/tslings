// With `strictNullChecks` (part of `strict`), `null` and `undefined` are types
// of their own, and TypeScript won't let you use a value that may be one of
// them. Optional chaining `?.` is the short way through. `a?.b` reads `b` only
// when `a` isn't null or undefined; otherwise the whole chain stops and gives
// `undefined`. It also works for method calls (`a?.trim()`) and for calling a
// function that may be missing (`onDone?.()`).
//
// JSON APIs send `null` for "no value", while a missing optional field reads as
// `undefined`. The two are different types (`null` doesn't fit in
// `string | undefined`), but `?.` handles both and always gives `undefined`.
//
// Make these helpers for a GitHub-like API response safe.

import { test } from "node:test";
import assert from "node:assert/strict";

type Repo = {
  name: string;
  license: { spdxId: string; name: string } | null;
  owner: { login: string; company: string | null };
};

function licenseId(repo: Repo): string | undefined {
  // `repo.license && repo.license.spdxId` would give `string | null`, which
  // doesn't fit the return type: `?.` turns the null into `undefined`.
  return repo.license?.spdxId;
}

function ownerCompany(repo: Repo): string | undefined {
  return repo.owner.company?.trim();
}

function syncRepo(repo: Repo, onSynced?: (name: string) => void): void {
  // ...imagine the repository being synced here...
  onSynced?.(repo.name);
}

// Don't change the tests below.

const tslings: Repo = {
  name: "tslings",
  license: { spdxId: "MIT", name: "MIT License" },
  owner: { login: "ada", company: " Initech " },
};
const scratch: Repo = {
  name: "scratch",
  license: null,
  owner: { login: "grace", company: null },
};

test("license", () => {
  assert.equal(licenseId(tslings), "MIT");
  assert.equal(licenseId(scratch), undefined);
});

test("company", () => {
  assert.equal(ownerCompany(tslings), "Initech");
  assert.equal(ownerCompany(scratch), undefined);
});

test("optional callback", () => {
  const synced: string[] = [];
  syncRepo(tslings, (name) => synced.push(name));
  assert.deepEqual(synced, ["tslings"]);
  assert.doesNotThrow(() => syncRepo(scratch));
});
