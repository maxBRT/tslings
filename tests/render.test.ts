import assert from "node:assert/strict";
import { test } from "node:test";
import type { Problem } from "../src/checker.ts";
import { formatError } from "../src/errors.ts";
import { formatPosition, renderProblems, splitUnion } from "../src/render.ts";
import { outputWidth } from "../src/term.ts";
import { wrapText } from "../src/wrap.ts";

const source = 'let x = 1;\nconst count: number = "three";\n';
const sources = new Map([["/project/exercises/a.ts", source]]);

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
  const output = renderProblems([problem()], new Map([["/project/exercises/a.ts", source]]), { cwd: "/project", color: false, width: 86 });
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

test("every prose line is wrapped to the width, the `=` gutter aligned", () => {
  const output = renderProblems(
    [
      problem({
        code: "TS2551",
        message: "Property 'fistName' does not exist on type 'CustomerAccountProfile'. Did you mean 'firstName'?",
        details: ["Type '{ firstName: string; lastName: string; }' is missing the following properties: emailAddress, loyaltyPoints"],
        related: [
          { message: "'firstName' is declared here, in the interface that describes every customer.", file: "/project/exercises/a.ts", start: 0, end: 3 },
        ],
      }),
    ],
    sources,
    { cwd: "/project", color: false, width: 60 },
  );
  assert.equal(
    output.slice(0, output.indexOf("\n  = help:")),
    `error[TS2551]: Property 'fistName' does not exist on type
               'CustomerAccountProfile'. Did you mean
               'firstName'?
 --> exercises/a.ts:2:7
  |
2 | const count: number = "three";
  |       ^^^^^
  = Type '{ firstName: string; lastName: string; }' is
    missing the following properties: emailAddress,
    loyaltyPoints
  = related: 'firstName' is declared here, in the interface
             that describes every customer.
             (exercises/a.ts:1:1)`,
  );
  for (const line of output.split("\n")) assert.ok(line.length <= 60, `too long: ${line}`);
});

test("code frames are never wrapped", () => {
  const long = `const total: number = ${'"x" + '.repeat(30)}"x";\n`;
  const output = renderProblems([problem({ start: 6, end: 11 })], new Map([["/project/exercises/a.ts", long]]), { cwd: "/project", color: false, width: 40 });
  assert.ok(output.includes(`1 | ${long.trimEnd()}\n`));
});

test("expected and found types are wrapped after their `;`", () => {
  const output = renderProblems(
    [
      problem({
        code: "TS2344",
        types: [
          { label: "expected", type: "{ id: string; name: string; priceCents: number; downloadUrl: string; }" },
          { label: "found", type: "{}" },
        ],
      }),
    ],
    sources,
    { cwd: "/project", color: false, width: 60, notes: { TS2344: "Compare." } },
  );
  assert.match(output, /\n {2}= expected: \{ id: string; name: string;\n {16}priceCents: number; downloadUrl: string; \}\n {2}= found: {4}\{\}\n/);
});

test("a note under the types says what tells them apart", () => {
  const output = renderProblems(
    [problem({ code: "TS2344", types: [{ label: "expected", type: "{ a: 1; }" }, { label: "found", type: "{ readonly a: 1; }" }], typeNote: "Only `readonly` differs." })],
    sources,
    { cwd: "/project", color: false, notes: { TS2344: "Compare." } },
  );
  assert.match(output, /\n {2}= found: {4}\{ readonly a: 1; \}\n {2}= note: Only `readonly` differs\.\n {2}= help: Compare\.\n/);
});

test("related information right at the error doesn't repeat its location", () => {
  const output = renderProblems(
    [problem({ related: [{ message: "Did you forget to use 'await'?", file: "/project/exercises/a.ts", start: source.indexOf("count"), end: source.indexOf("count") + 5 }] })],
    sources,
    { cwd: "/project", color: false },
  );
  assert.match(output, /= related: Did you forget to use 'await'\?\n/);
});

test("the watch mode shows the first problems and counts the others", () => {
  const problems = [
    ...Array.from({ length: 9 }, (_, index) => problem({ message: `Error number ${index + 1}.` })),
    problem({ source: "lint", code: "prefer-const", severity: "warning", message: "use const", note: "Why." }),
  ];
  const output = renderProblems(problems, sources, { cwd: "/project", color: false, width: 120, maxProblems: 3 });
  assert.match(output, /Error number 3\./);
  assert.doesNotMatch(output, /Error number 4\./);
  assert.match(
    output,
    /\n\n\.\.\. and 6 more errors and 1 more warning\. Fix the first ones: later errors are often caused by them\.\n\n9 errors, 1 warning\n$/,
  );
  // Too long for the line, the advice goes under the count.
  assert.match(
    renderProblems(problems, sources, { cwd: "/project", color: false, width: 80, maxProblems: 3 }),
    /\n\n\.\.\. and 6 more errors and 1 more warning\.\n {4}Fix the first ones: later errors are often caused by them\.\n\n9 errors, 1 warning\n$/,
  );
  const all = renderProblems(problems, sources, { cwd: "/project", color: false });
  assert.match(all, /Error number 9\./);
  assert.doesNotMatch(all, /more error/);
});

test("exercise notes can be keyed by a part of the message", () => {
  const notes = { TS2339: "Any property.", "TS2339 'radius'": "Circles only.", "TS2339 radius' does not": "The most specific." };
  const render = (message: string): string =>
    renderProblems([problem({ code: "TS2339", message })], sources, { cwd: "/project", color: false, notes });
  assert.match(render("Property 'side' does not exist on type 'Shape'."), /help: Any property\./);
  assert.match(render("Property 'radius' exists on 'Circle' only."), /help: Circles only\./);
  assert.match(render("Property 'radius' does not exist on type 'Shape'."), /help: The most specific\./);
});

test("wrapping keeps code spans and quoted types together when it can", () => {
  assert.deepEqual(wrapText("Type 'Promise<User>' is missing `await` here", 12, 30), ["Type", "'Promise<User>' is missing", "`await` here"]);
  // Wider than a line: broken at its spaces after all.
  assert.deepEqual(wrapText("see 'a b c d e f g'", 8, 8), ["see 'a b", "c d e f", "g'"]);
  // A span that starts the text must fit the first line, even when the next ones are wider.
  assert.deepEqual(wrapText("'a b c d e f' is wrong", 8, 20), ["'a b c d", "e f' is wrong"]);
  // Apostrophes don't open a span.
  assert.deepEqual(wrapText("doesn't fit, can't wrap", 12, 12), ["doesn't fit,", "can't wrap"]);
  // One long word stays whole.
  assert.deepEqual(wrapText("x".repeat(30), 10, 10), ["x".repeat(30)]);
  assert.deepEqual(wrapText('{ a: "x; y"; b: number; }', 14, 14, "type"), ['{ a: "x; y";', "b: number; }"]);
});

test("the output width follows the terminal, up to 100 columns", () => {
  assert.equal(outputWidth({ isTTY: true, columns: 80 }), 80);
  assert.equal(outputWidth({ isTTY: true, columns: 200 }), 100);
  assert.equal(outputWidth({ isTTY: false, columns: 80 }), 100);
});
