// The checker against real files: TypeScript errors and the tslings lint rules.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { Checker, type CheckOptions, type Problem } from "../src/checker.ts";
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

/** Check a snippet and return its problems. */
function problems(source: string, options: CheckOptions = {}): readonly Problem[] {
  if (checker === undefined) throw new Error("The checker isn't started");
  const file = join(dir, "exercises", `snippet${counter++}.ts`);
  writeFileSync(file, source);
  return checker.check(file, options).problems;
}

/** Check a snippet and return `severity:code` for each problem. */
function check(source: string, options: CheckOptions = {}): string[] {
  return problems(source, options).map((problem) => `${problem.severity}:${problem.code}`);
}

/** The text each problem points at. */
function spans(source: string, options: CheckOptions = {}): string[] {
  return problems(source, options).map((problem) => `${problem.code}: ${source.slice(problem.start, problem.end)}`);
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

  test("no-non-null-assertion also covers definite assignment assertions", () => {
    assert.deepEqual(spans("let total!: number;\nexport const read = (): number => total;\n"), ["no-non-null-assertion: total!"]);
    const field = problems("export class User {\n  name!: string;\n  nickname?: string;\n}\n");
    assert.deepEqual(
      field.map((problem) => [problem.code, problem.message]),
      [["no-non-null-assertion", "definite assignment assertions (`name!: Type`) are not allowed in tslings exercises"]],
    );
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

describe("no-unsafe-any: `any` that nobody wrote", () => {
  test("`JSON.parse` returned from a typed function", () => {
    assert.deepEqual(
      spans("export function clone<T>(value: T): T {\n  return JSON.parse(JSON.stringify(value));\n}\n"),
      ["no-unsafe-any: JSON.parse(JSON.stringify(value))"],
    );
  });

  test("into a variable without a type annotation", () => {
    assert.deepEqual(spans('export const settings = JSON.parse("{}");\n'), ['no-unsafe-any: JSON.parse("{}")']);
    // The idiom: `unknown`, then narrow.
    assert.deepEqual(check('export const settings: unknown = JSON.parse("{}");\n'), []);
  });

  test("collections of `any`", () => {
    const [problem, ...rest] = problems("export const counts = new Map();\n");
    assert.equal(rest.length, 0);
    assert.equal(problem?.code, "no-unsafe-any");
    assert.equal(problem.message, "this value has type `Map<any, any>`, which switches type checking off");
    assert.deepEqual(check("export const counts = new Map<string, number>();\n"), []);
    assert.deepEqual(check("export const counts: Map<string, number> = new Map();\n"), []);
    assert.deepEqual(check("export function counts(): Map<string, number> {\n  return new Map();\n}\n"), []);
  });

  test("arguments, unless the parameter is `unknown` or `any`", () => {
    const source = 'import assert from "node:assert/strict";\n' +
      "function double(n: number): number {\n  return n * 2;\n}\n" +
      'export const twice = double(JSON.parse("2"));\n' +
      'assert.equal(JSON.parse("2"), 2);\n' +
      'console.log(JSON.parse("2"));\n';
    assert.deepEqual(spans(source), ['no-unsafe-any: JSON.parse("2")']);
    assert.equal(problems(source)[0]?.start, source.indexOf('JSON.parse("2")'));
  });

  test("promises of `any`, and `any[]` from `Array.isArray`", () => {
    const load = (type: string): string =>
      `export function load(text: Promise<string>): Promise<${type}> {\n  return text.then(JSON.parse);\n}\n`;
    assert.deepEqual(check(load("{ id: string }")), ["error:no-unsafe-any"]);
    assert.deepEqual(check(load("unknown")), []);
    assert.deepEqual(
      spans('export function first(value: unknown): string {\n  return Array.isArray(value) ? value[0] : "";\n}\n'),
      ['no-unsafe-any: Array.isArray(value) ? value[0] : ""'],
    );
  });

  test("a value is reported where it comes from, not at each use", () => {
    const source =
      'function show(text: string): string {\n  return text;\n}\nconst raw = JSON.parse("{}");\nshow(raw.name);\n' +
      'export function size(): number {\n  return raw.size > 0 ? raw.size : 16;\n}\n';
    assert.deepEqual(spans(source), ['no-unsafe-any: JSON.parse("{}")']);
  });

  test("waits until type errors are fixed: they make `any` on their own", () => {
    assert.deepEqual(check("export function shout(text) {\n  return text.toUpperCase();\n}\n"), ["error:TS7006"]);
  });

  test("an exercise can allow it", () => {
    assert.deepEqual(check('export const settings = JSON.parse("{}");\n', { allowLints: ["no-unsafe-any"] }), []);
  });
});

describe("failing type tests show both types", () => {
  const helpers =
    "type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;\n" +
    "type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;\n" +
    "type Expect<T extends true> = T;\n";

  test("Expect<Equal<found, expected>>", () => {
    const source = `${helpers}type Args<T> = T extends undefined ? [payload: T] : [];\ntype _tests = [Expect<Equal<Args<undefined>, []>>];\n`;
    const [problem, ...rest] = problems(source);
    assert.equal(rest.length, 0);
    assert.equal(problem?.code, "TS2344");
    // The alias is expanded: `Args<undefined>` wouldn't tell what's wrong.
    assert.deepEqual(problem.types, [
      { label: "expected", type: "[]" },
      { label: "found", type: "[payload: undefined]" },
    ]);
  });

  test("Expect<NotEqual<A, B>>", () => {
    const [problem] = problems(`${helpers}type _test = Expect<NotEqual<{ a: 1 }, { a: 1 }>>;\n`);
    assert.deepEqual(problem?.types, [{ label: "both types are", type: "{ a: 1; }" }]);
  });

  /** `expected` and `found` of the snippet's only failing type test, and the note if any. */
  const compare = (source: string): { expected?: string; found?: string; note?: string } => {
    const failing = problems(`${helpers}${source}`).filter((problem) => problem.code === "TS2344");
    assert.equal(failing.length, 1, JSON.stringify(failing));
    const [problem] = failing;
    const result: { expected?: string; found?: string; note?: string } = {};
    for (const { label, type } of problem?.types ?? []) {
      if (label === "expected" || label === "found") result[label] = type;
    }
    if (problem?.typeNote !== undefined) result.note = problem.typeNote;
    return result;
  };

  test("interfaces and aliases show their members on both sides", () => {
    assert.deepEqual(compare("interface Product {}\ntype _t = Expect<Equal<Product, { id: string; name: string }>>;\n"), {
      expected: "{ id: string; name: string; }",
      found: "{}",
    });
    // In a union, too, and one level deep only.
    assert.deepEqual(
      compare(
        "interface User { name: string }\ntype Product = { sku: string; owner: User };\n" +
          "declare function find(): Product;\ntype _t = Expect<Equal<ReturnType<typeof find>, Product | undefined>>;\n",
      ),
      { expected: "{ sku: string; owner: User; } | undefined", found: "{ sku: string; owner: User; }" },
    );
    assert.deepEqual(compare("interface Box<T> { value: T }\ntype _t = Expect<Equal<Box<string>, Box<number> | null>>;\n"), {
      expected: "{ value: number; } | null",
      found: "{ value: string; }",
    });
  });

  test("modifiers are shown, and named when they are the only difference", () => {
    assert.deepEqual(
      compare("interface Settings { readonly theme: string; size?: number; label?: string | undefined }\ntype _t = Expect<Equal<Settings, { theme: string; size: number; label?: string | undefined }>>;\n"),
      {
        expected: "{ theme: string; size: number; label?: string | undefined; }",
        found: "{ readonly theme: string; size?: number; label?: string | undefined; }",
        note: "The types only differ in their `readonly` and optional (`?`) modifiers.",
      },
    );
    assert.equal(compare("type _t = Expect<Equal<Readonly<{ a: 1 }>, { a: 1 }>>;\n").found, "{ readonly a: 1; }");
  });

  test("types that print the same get a hint", () => {
    const { expected, found, note } = compare(
      "export function make() {\n  interface User { a: 1 }\n  const u: User = { a: 1 };\n  return { u };\n}\n" +
        "interface User { a: 2 }\ntype _t = Expect<Equal<ReturnType<typeof make>, { u: User }>>;\n",
    );
    assert.equal(expected, "{ u: User; }");
    assert.equal(found, expected);
    assert.match(note ?? "", /^Both types print the same/);
  });

  test("an intersection and one object type with the same properties are told apart", () => {
    const { expected, found, note } = compare(
      "type Product = { id: string };\ntype _t = Expect<Equal<{ id: string; quantity: number }, Product & { quantity: number }>>;\n",
    );
    assert.equal(expected, "{ id: string; } & { quantity: number; }");
    assert.equal(found, "{ id: string; quantity: number; }");
    assert.match(note ?? "", /`expected` is an intersection/);
    // Same property names, but a property type differs too: writing `&` wouldn't be enough.
    assert.deepEqual(compare("type _t = Expect<Equal<{ a: string; b: string }, { a: string } & { b: number }>>;\n"), {
      expected: "{ a: string; } & { b: number; }",
      found: "{ a: string; b: string; }",
    });
  });

  test("huge types are shortened the way TypeScript does", () => {
    const properties = Array.from({ length: 300 }, (_, index) => `p${index}: string;`).join(" ");
    assert.equal(compare(`interface Big { ${properties} }\ntype _t = Expect<Equal<Big, {}>>;\n`).found, "Big");
    const members = Array.from({ length: 200 }, (_, index) => `{ kind: "k${index}"; v: ${index} }`).join(" | ");
    const { found = "" } = compare(`type _t = Expect<Equal<${members}, { kind: "a" }>>;\n`);
    assert.ok(found.length < 1000, found);
    assert.match(found, /\.\.\. \d+ more \.\.\./);
  });

  test("library types, classes, functions and tuples keep TypeScript's printing", () => {
    assert.deepEqual(compare("class Money { cents = 0 }\ntype _t = Expect<Equal<Money, Date | Map<string, number> | [a: 1] | ((n: number) => string)>>;\n"), {
      expected: "Date | Map<string, number> | ((n: number) => string) | [a: 1]",
      found: "Money",
    });
    assert.deepEqual(compare("type _t = Expect<Equal<string | boolean | null, Record<\"a\", number>>>;\n"), {
      expected: "{ a: number; }",
      found: "string | boolean | null",
    });
  });

  test("other constraint errors are left alone", () => {
    const [problem] = problems("type Id<T extends string> = T;\nexport type Five = Id<5>;\n");
    assert.equal(problem?.code, "TS2344");
    assert.equal(problem.types, undefined);
  });
});

describe("extra files", () => {
  test("are re-read from disk with the exercise", () => {
    if (checker === undefined) throw new Error("The checker isn't started");
    const module = join(dir, "exercises", "rates.ts");
    const exercise = join(dir, "exercises", "prices.ts");
    writeFileSync(module, "export const rate: number = 2;\n");
    writeFileSync(exercise, 'import { rate } from "./rates.ts";\nexport const price: number = 10 * rate;\n');
    assert.deepEqual(checker.check(exercise, { extraFiles: [module] }).problems, []);

    writeFileSync(module, 'export const rate: string = "2";\n');
    const codes = checker.check(exercise, { extraFiles: [module] }).problems.map((problem) => problem.code);
    assert.deepEqual(codes, ["TS2363"]);
  });
});

describe("style rules are warnings, errors with strict lint", () => {
  test("no-var", () => {
    assert.deepEqual(check("var count = 1;\ncount++;\nexport { count };\n"), ["warning:no-var"]);
    assert.deepEqual(check("var count = 1;\ncount++;\nexport { count };\n", { strictLint: true }), ["error:no-var"]);
  });

  test("no-var leaves ambient declarations alone: `var` is how globals are typed", () => {
    assert.deepEqual(check("declare global {\n  var requestCount: number;\n}\nexport {};\n", { strictLint: true }), []);
    assert.deepEqual(check("declare var buildId: string;\nexport const id = buildId;\n", { strictLint: true }), []);
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
