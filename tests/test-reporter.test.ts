import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runFile } from "../src/runner.ts";
import { temporaryDir } from "./helpers.ts";

async function runTests(source: string): Promise<{ success: boolean; output: string }> {
  const dir = temporaryDir();
  mkdirSync(join(dir, "exercises"));
  writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
  writeFileSync(join(dir, "exercises", "tests.ts"), source);
  return runFile(join(dir, "exercises", "tests.ts"), { test: true, cwd: dir, color: false });
}

test("passing tests are listed with a summary", async () => {
  const { success, output } = await runTests('import { test } from "node:test";\ntest("one", () => {});\ntest("two", () => {});\n');
  assert.equal(success, true);
  assert.equal(output, "✔ one\n✔ two\n\n2 passed\n");
});

test("a failure shows the assertion and where it failed", async () => {
  const { success, output } = await runTests(`import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("prices", () => {
  it("adds tax", () => {
    assert.equal(10 * 1.2, 12);
  });
  it("rounds", () => {
    assert.equal(Math.round(2.5), 2);
  });
});
`);
  assert.equal(success, false);
  assert.equal(
    output,
    `prices
  ✔ adds tax
  ✖ rounds
      Expected values to be strictly equal:

      3 !== 2

      at exercises/tests.ts:9:12

1 passed, 1 failed
`,
  );
});

test("errors thrown by the code name their type", async () => {
  const { output } = await runTests('import { test } from "node:test";\ntest("parses", () => {\n  JSON.parse("{");\n});\n');
  assert.match(output, /✖ parses\n {4}SyntaxError: /);
});

test("a file without tests doesn't pass", async () => {
  const { success, output } = await runTests('console.log("no tests here");\n');
  assert.equal(success, false);
  assert.match(output, /no tests here\nNo tests ran\./);
});

test("a crash before the tests is reported", async () => {
  const { success, output } = await runTests('import { test } from "node:test";\nthrow new Error("broken setup");\ntest("never", () => {});\n');
  assert.equal(success, false);
  assert.match(output, /Error: broken setup\n {4}at exercises\/tests\.ts:2:7/);
  assert.match(output, /The file crashed before all its tests could run/);
});
