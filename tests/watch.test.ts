// The watch mode and the list mode in a real pseudo-terminal, through
// util-linux's `script`. Skipped where `script` isn't available.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cli, fakePackage, temporaryDir } from "./helpers.ts";

const hasScript = process.platform === "linux" && spawnSync("script", ["--version"]).status === 0;

/** Save a file like many editors do: write a new file, then rename it over the old one. */
function saveAtomically(file: string, content: string): void {
  writeFileSync(`${file}.tmp`, content);
  renameSync(`${file}.tmp`, file);
}

/** A program running in a pseudo-terminal, with what it printed so far (escape sequences removed). */
class Terminal {
  #raw = "";
  readonly #child;
  readonly exited: Promise<number | null>;

  constructor(command: string, cwd: string) {
    this.#child = spawn("script", ["-qfec", `stty cols 100 rows 30; exec ${command}`, "/dev/null"], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color", NO_COLOR: "1", FORCE_COLOR: undefined, NODE_TEST_CONTEXT: undefined, TERM_PROGRAM: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.#child.stdout.setEncoding("utf8").on("data", (chunk: string) => (this.#raw += chunk));
    this.#child.stderr.setEncoding("utf8").on("data", (chunk: string) => (this.#raw += chunk));
    this.exited = new Promise((resolve) => this.#child.on("close", resolve));
  }

  get text(): string {
    return this.#raw.replace(/\x1b\[[0-9;?<>=]*[A-Za-z~]|\x1b\][^\x1b]*\x1b\\/g, "").replaceAll("\r\n", "\n");
  }

  type(keys: string): void {
    this.#child.stdin.write(keys);
  }

  /** Wait until the output matches, `after` characters into it. */
  async waitFor(pattern: RegExp, after = 0): Promise<number> {
    for (let attempt = 0; attempt < 200; attempt++) {
      const text = this.text;
      const match = pattern.exec(text.slice(after));
      if (match !== null) return after + match.index + match[0].length;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${pattern}. Output:\n${this.text}`);
  }

  kill(): void {
    this.#child.kill();
  }
}

test("watch mode: hint, rerun on save, list, quit", { skip: !hasScript && "needs util-linux `script`", timeout: 60_000 }, async () => {
  const main = fakePackage();
  const dir = temporaryDir();
  cli(["init", "--no-install"], { cwd: dir, main });
  const tslings = join(dir, "tslings");
  // Skip the welcome message, start at intro2.
  writeFileSync(join(tslings, ".tslings-state.txt"), "DON'T EDIT THIS FILE!\n\nintro2\n\nintro1");

  const terminal = new Terminal(`'${process.execPath}' '${main}'`, tslings);
  try {
    let at = await terminal.waitFor(/error\[TS2339\]: Property 'lgo' does not exist/);
    at = await terminal.waitFor(/Current exercise: exercises\/00_intro\/intro2\.ts\n\nh:hint \/ l:list \/ x:reset \/ q:quit \?/, at);

    terminal.type("h");
    at = await terminal.waitFor(/Hint\nFix the typo in `console\.lgo`\./, at);
    at = await terminal.waitFor(/l:list \/ x:reset \/ q:quit \?/, at);

    const file = join(tslings, "exercises", "00_intro", "intro2.ts");
    const original = readFileSync(file, "utf8");
    // Every save is seen, also after the file was replaced by a new one.
    saveAtomically(file, original.replace("lgo", "log"));
    at = await terminal.waitFor(/Exercise done ✓/, at);
    saveAtomically(file, original);
    at = await terminal.waitFor(/error\[TS2339\]/, at);
    writeFileSync(file, original.replace("lgo", "log"));
    at = await terminal.waitFor(/Output\nHello world!\n\nExercise done ✓\nSolution for comparison: solutions\/00_intro\/intro2\.ts/, at);
    at = await terminal.waitFor(/n:next \/ h:hint \/ l:list \/ x:reset \/ q:quit \?/, at);

    terminal.type("l");
    at = await terminal.waitFor(/Current {2}State {4}Name {5}Path/, at);
    // An exercise is only marked as done when moving on with `n`.
    at = await terminal.waitFor(/❯ >>>>>>> {2}PENDING {2}intro2/, at);
    terminal.type("q");
    at = await terminal.waitFor(/Checking the exercise `intro2`/, at);
    // Keys are ignored while the exercise runs: wait for the prompt.
    at = await terminal.waitFor(/n:next \/ h:hint/, at);

    terminal.type("n");
    at = await terminal.waitFor(/Current exercise: exercises\/01_basics\/basics1\.ts/, at);
    terminal.type("q");
    await terminal.waitFor(/We hope you're enjoying learning TypeScript!/, at);
    assert.equal(await terminal.exited, 0);
    assert.equal(readFileSync(join(tslings, ".tslings-state.txt"), "utf8"), "DON'T EDIT THIS FILE!\n\nbasics1\n\nintro1\nintro2");
  } finally {
    terminal.kill();
  }
});

test("watch mode: reset asks for confirmation", { skip: !hasScript && "needs util-linux `script`", timeout: 60_000 }, async () => {
  const main = fakePackage();
  const dir = temporaryDir();
  cli(["init", "--no-install"], { cwd: dir, main });
  const tslings = join(dir, "tslings");
  writeFileSync(join(tslings, ".tslings-state.txt"), "DON'T EDIT THIS FILE!\n\nintro2\n");
  const file = join(tslings, "exercises", "00_intro", "intro2.ts");
  const original = readFileSync(file, "utf8");
  writeFileSync(file, "// my attempt\nconsole.log(1);\n");

  const terminal = new Terminal(`'${process.execPath}' '${main}' --manual-run`, tslings);
  try {
    let at = await terminal.waitFor(/r:run \/ h:hint \/ l:list \/ x:reset \/ q:quit \?/);
    terminal.type("x");
    at = await terminal.waitFor(/Resetting will undo all your changes to the file exercises\/00_intro\/intro2\.ts\nReset \(y\/n\)\? /, at);
    // Other keys are ignored until the answer.
    terminal.type("q");
    terminal.type("y");
    at = await terminal.waitFor(/error\[TS2339\]/, at);
    assert.equal(readFileSync(file, "utf8"), original);
    terminal.type("q");
    assert.equal(await terminal.exited, 0);
  } finally {
    terminal.kill();
  }
});
