// Runs an exercise with Node's built-in TypeScript support.
//
// Node erases the types and runs the file as-is, so what learners write is
// exactly what runs. Test exercises use Node's built-in test runner.

import { spawn } from "node:child_process";

export interface RunResult {
  readonly success: boolean;
  /** Combined stdout and stderr, in order. */
  readonly output: string;
  readonly timedOut: boolean;
}

export interface RunOptions {
  /** Run the file's `node:test` tests instead of just executing it. */
  readonly test: boolean;
  readonly cwd: string;
  readonly color: boolean;
  readonly timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 15_000;

export function runFile(file: string, options: RunOptions): Promise<RunResult> {
  const args = options.test
    ? ["--test", "--test-reporter=spec", "--disable-warning=ExperimentalWarning", file]
    : ["--disable-warning=ExperimentalWarning", file];

  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: options.color ? "1" : "0",
        NO_COLOR: options.color ? "" : "1",
        NODE_OPTIONS: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        output += `\nThe exercise was stopped after ${Math.round((options.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} seconds. Is there an infinite loop, or a promise that never settles?\n`;
      }
      resolvePromise({ success: code === 0 && !timedOut, output, timedOut });
    });
  });
}
