import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { runFile } from "../src/runner.ts";
import { location } from "../src/test-reporter.ts";
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

      expected: 2
      actual:   3

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

test("strings that differ are shown one above the other, quoted", async () => {
  const { output } = await runTests(`import { test } from "node:test";
import assert from "node:assert/strict";
test("pads", () => {
  assert.equal("Main theme         4m", "Main theme 4m");
});
test("custom message", () => {
  assert.equal(1, 2, "one is not two");
});
`);
  assert.match(output, /✖ pads\n {4}Expected values to be strictly equal:\n\n {4}expected: "Main theme 4m"\n {4}actual: {3}"Main theme {9}4m"\n\n {4}at exercises\/tests\.ts:4:10\n/);
  assert.match(output, /✖ custom message\n {4}one is not two\n\n {4}expected: 2\n {4}actual: {3}1\n/);
});

test("a custom message is kept whole, without Node's diff", async () => {
  const { output } = await runTests(`import { test } from "node:test";
import assert from "node:assert/strict";
test("nullish", () => {
  assert.equal(null, undefined, "find gives undefined");
});
test("paragraphs", () => {
  assert.equal("Main theme         4m", "Main theme 4m", "Pad the title.\\n\\nThen add the time.");
});
`);
  // After these messages, Node writes \`+ actual - expected\` on the next line, not after a blank one.
  assert.match(output, /✖ nullish\n {4}find gives undefined\n\n {4}expected: undefined\n {4}actual: {3}null\n/);
  assert.match(output, /✖ paragraphs\n {4}Pad the title\.\n\n {4}Then add the time\.\n\n {4}expected: "Main theme 4m"\n/);
  assert.doesNotMatch(output, /\+ actual - expected/);
});

test("objects keep Node's diff", async () => {
  const { output } = await runTests('import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("o", () => {\n  assert.deepEqual({ a: 1 }, { a: 2 });\n});\n');
  assert.match(output, /\+ actual - expected/);
  assert.doesNotMatch(output, /expected: /);
});

test("an AbortError keeps its name and message", async () => {
  const { output } = await runTests(`import { test } from "node:test";
test("aborts", () => {
  const controller = new AbortController();
  controller.abort();
  controller.signal.throwIfAborted();
});
`);
  assert.match(output, /✖ aborts\n {4}AbortError: This operation was aborted\n\n {4}at exercises\/tests\.ts:4:14\n/);
});

test("the location skips Node's internal frames", () => {
  const error = new Error("x");
  error.stack = [
    "AbortError: This operation was aborted",
    "    at new DOMException (node:internal/per_context/domexception:76:18)",
    "    at AbortController.abort (node:internal/abort_controller:572:18)",
    `    at TestContext.<anonymous> (${pathToFileURL(join(process.cwd(), "exercises", "a.ts")).href}:6:58)`,
  ].join("\n");
  assert.equal(location(error), `${join("exercises", "a.ts")}:6:58`);
  error.stack = `Error: x\n    at ${pathToFileURL(join(process.cwd(), "exercises", "b.ts")).href}:1:2`;
  assert.equal(location(error), `${join("exercises", "b.ts")}:1:2`);
  // A plain path, without `file://`, is only recognized when it's absolute the POSIX way.
  if (process.platform !== "win32") {
    error.stack = `Error: x\n    at ${process.cwd()}/exercises/c.ts:1:2`;
    assert.equal(location(error), "exercises/c.ts:1:2");
  }
});
