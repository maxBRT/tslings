// Paths in the output: relative to the exercises' root, with `/` on every system.

import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { displayRelative, relativizeFileUrls } from "../src/paths.ts";

test("relative paths use / on every system", () => {
  assert.equal(displayRelative(process.cwd(), join(process.cwd(), "exercises", "a.ts")), "exercises/a.ts");
});

test("file URLs inside the root become relative paths, with their line and column", () => {
  const url = pathToFileURL(join(process.cwd(), "exercises", "tests.ts")).href;
  const stack = `Error: broken setup\n    at ${url}:2:7\n    at TestContext.<anonymous> (${url}:6:58)`;
  assert.equal(
    relativizeFileUrls(stack, process.cwd()),
    "Error: broken setup\n    at exercises/tests.ts:2:7\n    at TestContext.<anonymous> (exercises/tests.ts:6:58)",
  );
});

test("percent-encoded characters are decoded, like the `~` of Windows short names", () => {
  const url = pathToFileURL(join(process.cwd(), "exercises", "a~1.ts")).href.replace("~", "%7E");
  assert.equal(relativizeFileUrls(`at ${url}:1:2`, process.cwd()), "at exercises/a~1.ts:1:2");
});

test("file URLs outside the root are left alone", () => {
  const url = pathToFileURL(join(process.cwd(), "..", "elsewhere", "lib.js")).href;
  assert.equal(relativizeFileUrls(`at ${url}:1:1`, process.cwd()), `at ${url}:1:1`);
});
