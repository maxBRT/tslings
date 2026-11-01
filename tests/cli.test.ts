import assert from "node:assert/strict";
import { test } from "node:test";
import { type Args, parseCliArgs } from "../src/cli.ts";

function args(argv: readonly string[]): Args {
  const result = parseCliArgs(argv);
  if (result.kind !== "args") throw new Error(`expected arguments, got ${JSON.stringify(result)}`);
  return result.args;
}

function exit(argv: readonly string[]): { code: number; stdout: string; stderr: string } {
  const result = parseCliArgs(argv);
  if (result.kind !== "exit") throw new Error(`expected an exit, got ${JSON.stringify(result)}`);
  return { code: result.code, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

test("no arguments: watch mode", () => {
  assert.deepEqual(args([]), { command: { kind: "watch" }, noEditor: false, editCmd: undefined, manualRun: false });
});

test("global options", () => {
  assert.deepEqual(args(["--manual-run", "--edit-cmd", "code -r", "--no-editor"]), {
    command: { kind: "watch" },
    noEditor: true,
    editCmd: "code -r",
    manualRun: true,
  });
  assert.equal(args(["--edit-cmd=vim"]).editCmd, "vim");
});

test("subcommands", () => {
  assert.deepEqual(args(["run"]).command, { kind: "run", name: undefined });
  assert.deepEqual(args(["run", "intro1"]).command, { kind: "run", name: "intro1" });
  assert.deepEqual(args(["hint", "intro1"]).command, { kind: "hint", name: "intro1" });
  assert.deepEqual(args(["reset", "intro1"]).command, { kind: "reset", name: "intro1" });
  assert.deepEqual(args(["check-all"]).command, { kind: "check-all" });
  assert.deepEqual(args(["init"]).command, { kind: "init", noInstall: false });
  assert.deepEqual(args(["init", "--no-install"]).command, { kind: "init", noInstall: true });
  assert.deepEqual(args(["dev", "new", "path", "--no-git"]).command, { kind: "dev-new", path: "path", noGit: true });
  assert.deepEqual(args(["dev", "check", "-r"]).command, { kind: "dev-check", requireSolutions: true });
  assert.deepEqual(args(["dev", "update"]).command, { kind: "dev-update" });
});

test("help and version", () => {
  assert.match(exit(["--help"]).stdout, /^tslings is a collection of small exercises/);
  assert.match(exit(["-h"]).stdout, /-h, --help {17}Print help \(see more with '--help'\)/);
  assert.match(exit(["-V"]).stdout, /^tslings \d/);
  assert.match(exit(["help", "run"]).stdout, /Usage: tslings run \[NAME\]/);
  assert.match(exit(["dev", "check", "--help"]).stdout, /-r, --require-solutions/);
  // `--help` after a subcommand is the subcommand's help.
  assert.match(exit(["hint", "--help"]).stdout, /^Show a hint/);
});

test("usage errors exit with code 2", () => {
  const unknown = exit(["--frobnicate"]);
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /^error: unexpected argument '--frobnicate' found\n\nUsage: tslings \[OPTIONS\] \[COMMAND\]\n\nFor more information, try '--help'\.\n$/);
  assert.match(exit(["reset"]).stderr, /the following required arguments were not provided:\n {2}<NAME>\n\nUsage: tslings reset <NAME>/);
  assert.match(exit(["run", "a", "b"]).stderr, /unexpected argument 'b' found/);
  assert.match(exit(["nope"]).stderr, /unrecognized subcommand 'nope'/);
  assert.match(exit(["--edit-cmd"]).stderr, /a value is required for '--edit-cmd <EDIT_CMD>'/);
  assert.match(exit(["--manual-run=yes"]).stderr, /unexpected value 'yes'/);
  // `dev` alone shows its help on stderr.
  const dev = exit(["dev"]);
  assert.equal(dev.code, 2);
  assert.match(dev.stderr, /Usage: tslings dev <COMMAND>/);
});
