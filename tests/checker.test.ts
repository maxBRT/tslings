// The checker against real files: TypeScript errors and the tslings lint rules.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { Checker, type CheckOptions } from "../src/checker.ts";
import { writeCheckerConfig } from "../src/workspace.ts";
import { temporaryDir } from "./helpers.ts";

let dir = "";
let checker: Checker | undefined;
let counter = 0;

before(() => {
  dir = temporaryDir();
  mkdirSync(join(dir, "exercises"));
  writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
  checker = new Checker(writeCheckerConfig("community", dir));
});

after(() => checker?.close());

/** Check a snippet and return `severity:code` for each problem. */
function check(source: string, options: CheckOptions = {}): string[] {
  if (checker === undefined) throw new Error("The checker isn't started");
  const file = join(dir, "exercises", `snippet${counter++}.ts`);
  writeFileSync(file, source);
  return checker.check(file, options).problems.map((problem) => `${problem.severity}:${problem.code}`);
}

describe("type errors", () => {
  test("are errors with their TS code", () => {
    assert.deepEqual(check('const count: number = "three";\nconsole.log(count);\n'), ["error:TS2322"]);
  });

  test("Node's types are known without npm install", () => {
    assert.deepEqual(check('import { readFileSync } from "node:fs";\nconsole.log(readFileSync);\n'), []);
  });
});

describe("cheat rules are always errors", () => {
  test("no-explicit-any", () => {
    assert.deepEqual(check("export const value: any = 1;\n"), ["error:no-explicit-any"]);
  });

  test("no-type-assertion, but `as const` is fine", () => {
    assert.deepEqual(check('const raw: unknown = "x";\nexport const text = raw as string;\n'), ["error:no-type-assertion"]);
    // Angle-bracket assertions aren't erasable syntax either (TS1294).
    assert.deepEqual(check('const raw: unknown = "x";\nexport const text = <string>raw;\n'), ["error:TS1294", "error:no-type-assertion"]);
    assert.deepEqual(check('export const sizes = ["s", "m"] as const;\n'), []);
  });

  test("no-non-null-assertion", () => {
    assert.deepEqual(check("const names = new Map<string, string>();\nexport const name = names.get('a')!;\n"), ["error:no-non-null-assertion"]);
  });

  test("no-ts-comment, not inside strings", () => {
    assert.deepEqual(check("// @ts-ignore\nexport const n: number = 1;\n"), ["error:no-ts-comment"]);
    assert.deepEqual(check("/* @ts-expect-error */\nexport const n: string = 1;\n"), ["error:no-ts-comment"]);
    assert.deepEqual(check('export const text = "// @ts-ignore";\n'), []);
  });

  test("an exercise can allow a rule when it's the lesson", () => {
    assert.deepEqual(check("// @ts-expect-error: strings aren't numbers\nexport const n: number = 'one';\n", { allowLints: ["no-ts-comment"] }), []);
  });
});

describe("style rules are warnings, errors with strict lint", () => {
  test("no-var", () => {
    assert.deepEqual(check("var count = 1;\ncount++;\nexport { count };\n"), ["warning:no-var"]);
    assert.deepEqual(check("var count = 1;\ncount++;\nexport { count };\n", { strictLint: true }), ["error:no-var"]);
  });

  test("eqeqeq, except `== null`", () => {
    assert.deepEqual(check("export function same(a: number, b: number): boolean {\n  return a == b;\n}\n"), ["warning:eqeqeq"]);
    assert.deepEqual(check("export function missing(a: number | null): boolean {\n  return a == null;\n}\n"), []);
  });

  test("prefer-const", () => {
    assert.deepEqual(check("let total = 1;\nexport { total };\n"), ["warning:prefer-const"]);
    assert.deepEqual(check("let total = 1;\ntotal += 1;\nexport { total };\n"), []);
    assert.deepEqual(check("export function f(xs: number[]): number {\n  let sum = 0;\n  for (const x of xs) sum += x;\n  return sum;\n}\n"), []);
  });
});
