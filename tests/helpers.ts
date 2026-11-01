// Helpers for the tests: temporary copies of the fixtures, and running the CLI
// as a subprocess.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after } from "node:test";

export const ROOT = resolve(import.meta.dirname, "..");
export const MAIN = join(ROOT, "src", "main.ts");

const temporaryDirs: string[] = [];
after(() => {
  for (const dir of temporaryDirs) rmSync(dir, { recursive: true, force: true });
});

export function temporaryDir(prefix = "tslings-test-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirs.push(dir);
  return dir;
}

/** A copy of `tests/test_exercises`: community exercises with a local `info.toml`. */
export function communityExercises(): string {
  const dir = temporaryDir();
  cpSync(join(ROOT, "tests", "test_exercises"), dir, { recursive: true });
  return dir;
}

/**
 * A fake tslings package whose official exercises are `tests/test_package`.
 * Returns the path of its `src/main.ts`.
 */
export function fakePackage(): string {
  const dir = temporaryDir("tslings-package-");
  for (const entry of ["src", "templates", "package.json"]) {
    cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
  }
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "dir");
  cpSync(join(ROOT, "tests", "test_package"), dir, { recursive: true });
  return join(dir, "src", "main.ts");
}

export interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Run the CLI without a terminal (stdin is closed, no colours). */
export function cli(args: readonly string[], options: { readonly cwd: string; readonly main?: string; readonly env?: NodeJS.ProcessEnv }): CliResult {
  const result = spawnSync(process.execPath, [options.main ?? MAIN, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: cliEnv(options.env),
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function cliEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1", TERM_PROGRAM: "", ...overrides };
  delete env.FORCE_COLOR;
  delete env.NODE_TEST_CONTEXT;
  return env;
}

/** Run a program to completion, e.g. `git`. */
export function sh(program: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(program, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${program} ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout;
}
