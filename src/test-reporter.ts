// A `node --test` reporter for learners: one line per test, the failure
// explained right under it with its location in the exercise, and a short
// summary. Node's own `spec` reporter also prints timings, counters and stack
// frames from Node's internals, which bury the one line that matters.
//
//   ✔ circle area
//   ✖ square area
//       Expected values to be strictly equal:
//
//       6 !== 9
//
//       at exercises/07_unions_narrowing/unions2.ts:24:10
//
//   1 passed, 1 failed

import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import type { TestEvent } from "node:test/reporters";

type Style = Parameters<typeof styleText>[0];
type Failure = Extract<TestEvent, { type: "test:fail" }>["data"];

// `styleText` checks `process.stdout`: tslings sets FORCE_COLOR or NO_COLOR for this process.
const paint = (style: Style, text: string): string => styleText(style, text);

/** `at exercises/…/name.ts:12:5`: the first stack frame outside Node itself. */
function location(error: unknown): string | undefined {
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  for (const match of stack.matchAll(/\(?((?:file:\/\/)?\/[^\s()]+?):(\d+):(\d+)\)?$/gm)) {
    const [, file = "", line = "", column = ""] = match;
    if (file.includes("/node_modules/")) continue;
    const path = file.startsWith("file://") ? fileURLToPath(file) : file;
    return `${relative(process.cwd(), path)}:${line}:${column}`;
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

/** What went wrong in a failed test, indented under its name. */
function explain(failure: Failure, by: string): string {
  const wrapper = failure.details.error;
  // Node wraps what the test threw in an ERR_TEST_FAILURE error, with the original as `cause`.
  const thrown: unknown = wrapper.cause instanceof Error ? wrapper.cause : wrapper;
  let message: string;
  if (thrown instanceof Error) {
    const isAssertion = thrown.name === "AssertionError";
    message = isAssertion || thrown === wrapper ? thrown.message : `${thrown.name}: ${thrown.message}`;
  } else {
    message = `The test threw a value that isn't an Error: ${String(thrown)}`;
  }
  const where = location(thrown);
  return `${indent(message, by)}\n${where === undefined ? "" : `\n${by}${paint("dim", `at ${where}`)}\n`}`;
}

/** Output of the exercise, with paths relative to the exercises' root and without Node's internals. */
function cleanOutput(message: string): string {
  return message
    .replaceAll(`file://${process.cwd()}/`, "")
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
