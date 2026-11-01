// A `node --test` reporter for learners: one line per test, the failure
// explained right under it with its location in the exercise, and a short
// summary. Node's own `spec` reporter also prints timings, counters and stack
// frames from Node's internals, which bury the one line that matters.
//
//   ✔ circle area
//   ✖ square area
//       Expected values to be strictly equal:
//
//       expected: 9
//       actual:   6
//
//       at exercises/07_unions_narrowing/unions2.ts:24:10
//
//   1 passed, 1 failed

import { resolve } from "node:path";
import { displayRelative, relativizeFileUrls } from "./paths.ts";
import { fileURLToPath } from "node:url";
import { inspect, styleText } from "node:util";
import type { TestEvent } from "node:test/reporters";

type Style = Parameters<typeof styleText>[0];
type Failure = Extract<TestEvent, { type: "test:fail" }>["data"];

// `styleText` checks `process.stdout`: tslings sets FORCE_COLOR or NO_COLOR for this process.
const paint = (style: Style, text: string): string => styleText(style, text);

/**
 * `at exercises/…/name.ts:12:5`: the first stack frame outside Node itself.
 * The path comes right after `at ` or `(`: `node:internal/…` frames never match.
 */
export function location(error: unknown): string | undefined {
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  for (const match of stack.matchAll(/(?:\(|\bat )((?:file:\/\/)?\/[^\s()]+?):(\d+):(\d+)\)?$/gm)) {
    const [, file = "", line = "", column = ""] = match;
    if (file.includes("/node_modules/")) continue;
    const path = file.startsWith("file://") ? fileURLToPath(file) : file;
    // `/` on every system, like the paths in the rest of tslings' output.
    return `${displayRelative(process.cwd(), path)}:${line}:${column}`;
  }
  return undefined;
}

function indent(text: string, by: string): string {
  return text
    .trimEnd()
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : by + line))
    .join("\n");
}

/** Comparisons whose message is a diff of `actual` and `expected`. */
const EQUALITY_OPERATORS: ReadonlySet<unknown> = new Set([
  "strictEqual",
  "equal",
  "deepStrictEqual",
  "deepEqual",
  "partialDeepStrictEqual",
]);

type Primitive = string | number | bigint | boolean | symbol | null | undefined;

function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

/** A value the way it's written in code: strings in double quotes, so that spaces at the ends show. */
function formatPrimitive(value: Primitive): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  if (Object.is(value, -0)) return "-0";
  return String(value);
}

/**
 * The message of a failed `assert.equal`. Node's one-line diff of two short
 * strings is hard to read (`'Main theme         4m'`): the values go on
 * separate lines instead, aligned. Objects, arrays and text of several lines
 * keep Node's diff, which points at the property or line that differs.
 */
export function assertionMessage(error: Error): string {
  // The fields of `AssertionError`, copied onto the error the reporter receives.
  const actual: unknown = Reflect.get(error, "actual");
  const expected: unknown = Reflect.get(error, "expected");
  const operator: unknown = Reflect.get(error, "operator");
  const generatedMessage: unknown = Reflect.get(error, "generatedMessage");
  if (!EQUALITY_OPERATORS.has(operator) || !isPrimitive(actual) || !isPrimitive(expected)) return error.message;
  // Node compares lines of text line by line, which reads well.
  if (typeof actual === "string" && typeof expected === "string" && (actual.includes("\n") || expected.includes("\n"))) {
    return error.message;
  }
  // A generated message is a title (`Expected values to be strictly equal:`), then Node's diff.
  const [generated = ""] = error.message.split("\n");
  const title = generatedMessage === false ? withoutDiff(error.message, actual, expected) : generated;
  return `${title.trimEnd()}\n\nexpected: ${formatPrimitive(expected)}\nactual:   ${formatPrimitive(actual)}`;
}

/**
 * A custom assertion message without the diff Node adds after it: either
 * `+ actual - expected` and the values on the next lines, or a blank line and
 * `1 !== 2`. The custom message itself may have blank lines.
 */
function withoutDiff(message: string, actual: Primitive, expected: Primitive): string {
  const diff = message.indexOf("\n+ actual - expected\n");
  if (diff !== -1) return message.slice(0, diff);
  const text = message.trimEnd();
  const comparison = `\n\n${inspect(actual)} !== ${inspect(expected)}`;
  return text.endsWith(comparison) ? text.slice(0, -comparison.length) : text;
}

/**
 * The name and message of an error that lost them on its way from the test to
 * the reporter. A `DOMException` (`AbortError`, `TimeoutError`) arrives as a
 * plain `Error` with an empty message: its stack still starts with both.
 */
export function errorTitle(error: Error): string {
  if (error.message !== "" || error.name !== "Error") return `${error.name}: ${error.message}`;
  const stack = error.stack ?? "";
  const frames = stack.search(/\n\s+at /);
  const head = (frames === -1 ? stack : stack.slice(0, frames)).trim();
  return head === "" ? error.name : head;
}

/** What went wrong in a failed test, indented under its name. */
function explain(failure: Failure, by: string): string {
  const wrapper = failure.details.error;
  // Node wraps what the test threw in an ERR_TEST_FAILURE error, with the original as `cause`.
  const thrown: unknown = wrapper.cause instanceof Error ? wrapper.cause : wrapper;
  let message: string;
  if (thrown instanceof Error) {
    if (thrown.name === "AssertionError") message = assertionMessage(thrown);
    else message = thrown === wrapper ? thrown.message : errorTitle(thrown);
  } else {
    message = `The test threw a value that isn't an Error: ${String(thrown)}`;
  }
  const where = location(thrown);
  return `${indent(message, by)}\n${where === undefined ? "" : `\n${by}${paint("dim", `at ${where}`)}\n`}`;
}

/** Output of the exercise, with paths relative to the exercises' root and without Node's internals. */
function cleanOutput(message: string): string {
  return relativizeFileUrls(message, process.cwd())
    .split("\n")
    .filter((line) => !/^\s+at .*(node:internal|\(node:)/.test(line) && !/^Node\.js v\d/.test(line))
    .join("\n");
}

/** Whether the event is about the test file itself rather than a test in it. */
function isFileLevel(data: { readonly name: string; readonly file?: string | undefined }): boolean {
  return data.file !== undefined && resolve(data.name) === resolve(data.file);
}

export default async function* tslingsReporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string, void> {
  const counts = { passed: 0, failed: 0, skipped: 0, todo: 0 };
  // Names of the suites containing the next test, by nesting level, and whether they're printed.
  const suites: { name: string; printed: boolean }[] = [];
  let fileFailed = false;
  // A blank line separates a failure from what follows.
  let gap = "";

  const header = (nesting: number): string => {
    let out = "";
    for (let level = 0; level < nesting; level++) {
      const suite = suites[level];
      if (suite !== undefined && !suite.printed) {
        out += `${"  ".repeat(level)}${paint("bold", suite.name)}\n`;
        suite.printed = true;
      }
    }
    return out;
  };

  for await (const event of source) {
    switch (event.type) {
      case "test:start":
        if (!isFileLevel(event.data)) {
          suites[event.data.nesting] = { name: event.data.name, printed: false };
          suites.length = event.data.nesting + 1;
        }
        break;

      case "test:stdout":
      case "test:stderr":
        // What the exercise prints, as is (without Node's internal stack frames).
        yield cleanOutput(event.data.message);
        break;

      case "test:pass": {
        const { data } = event;
        if (data.details.type === "suite" || isFileLevel(data)) break;
        const by = "  ".repeat(data.nesting);
        if (data.todo !== undefined && data.todo !== false) {
          counts.todo++;
          yield `${gap}${header(data.nesting)}${by}${paint("yellow", "○")} ${data.name} ${paint("yellow", "(todo)")}\n`;
        } else if (data.skip !== undefined && data.skip !== false) {
          counts.skipped++;
          yield `${gap}${header(data.nesting)}${by}${paint("dim", `○ ${data.name} (skipped)`)}\n`;
        } else {
          counts.passed++;
          yield `${gap}${header(data.nesting)}${by}${paint("green", "✔")} ${data.name}\n`;
        }
        gap = "";
        break;
      }

      case "test:fail": {
        const { data } = event;
        const { error } = data.details;
        const failureType = "failureType" in error ? error.failureType : undefined;
        if (isFileLevel(data)) {
          // The file crashed before or between tests; its error is in the stderr output above.
          if (failureType !== "subtestsFailed") fileFailed = true;
          break;
        }
        // A suite fails when one of its tests fails; that test was already reported.
        if (data.details.type === "suite" && failureType === "subtestsFailed") break;
        counts.failed++;
        const by = "  ".repeat(data.nesting);
        yield `${gap}${header(data.nesting)}${by}${paint("red", "✖")} ${data.name}\n${explain(data, `${by}    `)}`;
        gap = "\n";
        break;
      }

      default:
        break;
    }
  }

  const summary: string[] = [];
  if (counts.passed > 0) summary.push(paint("green", `${counts.passed} passed`));
  if (counts.failed > 0) summary.push(paint("red", `${counts.failed} failed`));
  if (counts.todo > 0) summary.push(paint("yellow", `${counts.todo} todo`));
  if (counts.skipped > 0) summary.push(paint("dim", `${counts.skipped} skipped`));

  if (fileFailed) {
    yield `\n${paint(["bold", "red"], "The file crashed before all its tests could run (see the error above)")}\n`;
  } else if (summary.length === 0) {
    // Deleting the tests isn't a way to pass an exercise.
    process.exitCode = 1;
    yield `${paint(["bold", "red"], "No tests ran.")} Did the tests at the bottom of the file get deleted?\n`;
  } else {
    yield `\n${summary.join(", ")}\n`;
  }
}
