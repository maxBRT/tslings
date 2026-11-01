// Run external programs: git, npm, editors.

import { execFile, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

export interface CommandOutput {
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Run a program to completion and return its output. Rejects with a readable
 * message when it can't start or exits with an error.
 */
export function runCommand(program: string, args: readonly string[], options: { readonly cwd?: string } = {}): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    execFile(
      program,
      args,
      { cwd: options.cwd, shell: isWindows, windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve({ stdout, stderr });
          return;
        }
        const command = [program, ...args].join(" ");
        reject(
          new Error(`The command \`${command}\` didn't run successfully\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`, {
            cause: error,
          }),
        );
      },
    );
  });
}

/** Run a program synchronously, ignoring its output. Returns whether it succeeded. */
export function runQuietly(program: string, args: readonly string[], options: { readonly cwd?: string } = {}): boolean {
  const result = spawnSync(program, args, {
    cwd: options.cwd,
    stdio: "ignore",
    shell: isWindows,
    windowsHide: true,
  });
  return result.error === undefined && result.status === 0;
}

/** `true` when `program --version` runs successfully. */
export function programExists(program: string): boolean {
  return runQuietly(program, ["--version"]);
}

/** On Windows, npm is a `.cmd` script. */
export const NPM = isWindows ? "npm.cmd" : "npm";
