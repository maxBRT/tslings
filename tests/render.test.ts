import assert from "node:assert/strict";
import { test } from "node:test";
import type { Problem } from "../src/checker.ts";
import { formatError } from "../src/errors.ts";
import { formatPosition, renderProblems, splitUnion } from "../src/render.ts";

const source = 'let x = 1;\nconst count: number = "three";\n';

function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    source: "typescript",
    code: "TS2322",
    severity: "error",
    message: "Type 'string' is not assignable to type 'number'.",
    details: [],
    file: "/project/exercises/a.ts",
    start: source.indexOf("count"),
    end: source.indexOf("count") + "count".length,
    related: [],
    ...overrides,
  };
}

test("rustc-style rendering with a code frame and a help note", () => {
  const output = renderProblems([problem()], new Map([["/project/exercises/a.ts", source]]), { cwd: "/project", color: false });
  assert.equal(
    output,
    `error[TS2322]: Type 'string' is not assignable to type 'number'.
 --> exercises/a.ts:2:7
  |
2 | const count: number = "three";
  |       ^^^^^
  = help: The value on the right doesn't fit the type on the left. Read the message
          from the end: it names the exact property or member that doesn't match.

1 error
`,
  );
});

test("exercise notes replace the built-in note", () => {
  const output = renderProblems([problem()], new Map([["/project/exercises/a.ts", source]]), {
    cwd: "/project",
    color: false,
    notes: { TS2322: "`count` holds a number of items." },
  });
  assert.match(output, /= help: `count` holds a number of items\.\n/);
});

test("warnings are counted separately", () => {
  const warning = problem({ source: "lint", code: "prefer-const", severity: "warning", message: "use const", start: 4, end: 5, note: "Why." });
  const output = renderProblems([problem(), warning], new Map([["/project/exercises/a.ts", source]]), { cwd: "/project", color: false });
  assert.match(output, /^warning\[prefer-const\]: use const$/m);
  assert.match(output, /\n1 error, 1 warning\n$/);
});

test("a note is shown once, under the first error it explains", () => {
  const output = renderProblems([problem(), problem(), problem({ code: "TS2339", message: "Property 'x' does not exist." })], new Map([["/project/exercises/a.ts", source]]), {
    cwd: "/project",
    color: false,
    notes: { TS2322: "`count` holds a number of items.", TS2339: "Narrow it first." },
  });
  assert.equal(output.match(/help: `count` holds a number of items\./g)?.length, 1);
  assert.equal(output.match(/help: Narrow it first\./g)?.length, 1);
});

test("notes never break inside a `code span`", () => {
  const note = "In tslings, a failing type test such as `Expect<Equal<typeof formatTotal, (order: Order) => string>>` reports this error.";
  const output = renderProblems([problem()], new Map([["/project/exercises/a.ts", source]]), { cwd: "/project", color: false, notes: { TS2322: note } });
  const help = output.slice(output.indexOf("= help:"));
  for (const line of help.split("\n")) {
    assert.equal((line.match(/`/g) ?? []).length % 2, 0, `unbalanced backticks in: ${line}`);
  }
  assert.match(help, /`Expect<Equal<typeof formatTotal, \(order: Order\) => string>>`/);
});

test("related information from TypeScript's library is shown by file name", () => {
  const lib = "/opt/tslings/node_modules/@typescript/typescript-linux-x64/lib/lib.es2024.object.d.ts";
  const types = "/opt/tslings/node_modules/@types/node/fs.d.ts";
  const output = renderProblems(
    [
      problem({
        related: [
          { message: "'groupBy' is declared here.", file: lib, start: 10, end: 17 },
          { message: "'readFile' is declared here.", file: types, start: 10, end: 17 },
        ],
      }),
    ],
    new Map([["/project/exercises/a.ts", source], [lib, "x".repeat(100)]]),
    { cwd: "/project", color: false },
  );
  assert.match(output, /= related: 'groupBy' is declared here\. \(lib\.es2024\.object\.d\.ts\)\n/);
  assert.match(output, /= related: 'readFile' is declared here\. \(@types\/node\/fs\.d\.ts\)\n/);
});

test("both sides of a failing type test, aligned", () => {
  const output = renderProblems(
    [
      problem({
        code: "TS2344",
        message: "Type 'false' does not satisfy the constraint 'true'.",
        types: [
          { label: "expected", type: "{ ok: true; value: number; } | { ok: false; error: string; }" },
          { label: "found", type: "{ ok: boolean; }" },
        ],
      }),
    ],
    new Map([["/project/exercises/a.ts", source]]),
    { cwd: "/project", color: false, notes: { TS2344: "Compare them." } },
  );
  assert.match(output, /\n {2}= expected: \{ ok: true; value: number; \} \| \{ ok: false; error: string; \}\n {2}= found: {4}\{ ok: boolean; \}\n {2}= help: Compare them\.\n/);
});

test("a long union gets one member per line", () => {
  const long = '{ channel: "email"; to: string; subject: string; } | { channel: "sms"; phone: string; text: string; } | { channel: "push"; deviceId: string; }';
  const output = renderProblems([problem({ code: "TS2344", types: [{ label: "expected", type: long }] })], new Map([["/project/exercises/a.ts", source]]), {
    cwd: "/project",
    color: false,
  });
  assert.match(
    output,
    /= expected: \{ channel: "email"; to: string; subject: string; \}\n {14}\| \{ channel: "sms"; phone: string; text: string; \}\n {14}\| \{ channel: "push"; deviceId: string; \}\n/,
  );
});

test("unions are split at the top level only", () => {
  assert.deepEqual(splitUnion('{ a: "x" | "y"; } | Map<string, 1 | 2> | ((n: number) => 1 | 2) | `${"p" | "q"}px` | "a | b"'), [
    '{ a: "x" | "y"; }',
    "Map<string, 1 | 2>",
    "((n: number) => 1 | 2)",
    '`${"p" | "q"}px`',
    '"a | b"',
  ]);
  assert.deepEqual(splitUnion("string"), ["string"]);
});

test("positions are 1-based", () => {
  assert.equal(formatPosition(source, 0), "1:1");
  assert.equal(formatPosition(source, source.indexOf("count")), "2:7");
});

test("errors are shown with their causes, like anyhow", () => {
  const error = new Error("Initialization failed", { cause: new Error("A directory exists.\nRun `cd tslings`") });
  assert.equal(formatError(error, false), "Error: Initialization failed\n\nCaused by:\n    A directory exists.\n    Run `cd tslings`\n");
  const deep = new Error("a", { cause: new Error("b", { cause: "c" }) });
  assert.equal(formatError(deep, false), "Error: a\n\nCaused by:\n    0: b\n    1: c\n");
});
