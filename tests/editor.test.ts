import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePaneId } from "../src/editor/zellij.ts";
import { splitShellWords } from "../src/shell-words.ts";

test("--edit-cmd is split like a shell would", () => {
  assert.deepEqual(splitShellWords("code"), ["code"]);
  assert.deepEqual(splitShellWords("  code   -r  "), ["code", "-r"]);
  assert.deepEqual(splitShellWords(`emacsclient -n --eval '(message "hi")'`), ["emacsclient", "-n", "--eval", '(message "hi")']);
  assert.deepEqual(splitShellWords(`"my editor" a\\ b "x\\"y" ''`), ["my editor", "a b", 'x"y', ""]);
  assert.deepEqual(splitShellWords(""), []);
  assert.throws(() => splitShellWords("code 'oops"), /Unclosed single quote/);
  assert.throws(() => splitShellWords('code "oops'), /Unclosed double quote/);
});

test("Zellij pane IDs", () => {
  assert.deepEqual(parsePaneId("terminal_12\n"), { name: "terminal_12", id: 12 });
  assert.equal(parsePaneId("plugin_3\n"), undefined);
  assert.equal(parsePaneId(""), undefined);
});
