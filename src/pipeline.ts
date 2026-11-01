// The full check of one exercise file: type-check, lint, then run.
//
// This mirrors rustlings (build, test, clippy, run), with TypeScript tools:
//   1. type-check with TypeScript 7; stop on errors
//   2. lint; cheat rules (`any`, `as`, `!`, `@ts-ignore`) always fail
//   3. run the file's `node:test` tests, or the file itself when `test = false`

import { readFileSync } from "node:fs";
import type { CheckOptions, Checker } from "./checker.ts";
import { renderProblems } from "./render.ts";
import { runFile } from "./runner.ts";

export interface ExerciseRunOptions extends CheckOptions {
  readonly test: boolean;
  readonly cwd: string;
  readonly color: boolean;
  readonly notes?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface ExerciseRunResult {
  readonly success: boolean;
  /** Which step failed, if any. */
  readonly failedStep?: "typecheck" | "lint" | "run";
  readonly output: string;
}

export async function runExerciseFile(
  checker: Checker,
  file: string,
  options: ExerciseRunOptions,
): Promise<ExerciseRunResult> {
  const { problems, ok } = checker.check(file, options);

  let output = "";
  if (problems.length > 0) {
    const sources = new Map<string, string>();
    for (const problem of problems) {
      for (const path of [problem.file, ...problem.related.map((related) => related.file)]) {
        if (path !== "" && !sources.has(path)) {
          try {
            sources.set(path, readFileSync(path, "utf8"));
          } catch {
            // Files outside the project (lib.d.ts…) are shown without a code frame.
          }
        }
      }
    }
    output += renderProblems(problems, sources, {
      cwd: options.cwd,
      color: options.color,
      ...(options.notes === undefined ? {} : { notes: options.notes }),
    });
  }

  if (!ok) {
    const failedStep = problems.some((problem) => problem.source === "typescript" && problem.severity === "error")
      ? "typecheck"
      : "lint";
    return { success: false, failedStep, output };
  }

  const run = await runFile(file, {
    test: options.test,
    cwd: options.cwd,
    color: options.color,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  output += (output.length > 0 ? "\n" : "") + run.output;
  return run.success ? { success: true, output } : { success: false, failedStep: "run", output };
}
