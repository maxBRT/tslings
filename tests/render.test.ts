import assert from "node:assert/strict";
import { test } from "node:test";
import type { Problem } from "../src/checker.ts";
import { formatError } from "../src/errors.ts";
import { formatPosition, renderProblems } from "../src/render.ts";

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
