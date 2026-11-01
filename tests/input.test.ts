import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeKeys } from "../src/input.ts";

const names = (data: string): string[] => decodeKeys(data).map((key) => (key.name === "char" ? key.char : key.name));

test("characters and control keys", () => {
  assert.deepEqual(names("nhq"), ["n", "h", "q"]);
  assert.deepEqual(names("\r\n\x7f\b\t\x03\x1a"), ["enter", "enter", "backspace", "backspace", "tab", "ctrl-c", "ctrl-z"]);
  assert.deepEqual(names("é🦀"), ["é", "🦀"]);
  // Other control characters are dropped.
  assert.deepEqual(names("\x01a"), ["a"]);
});

test("arrows, home and end in their different encodings", () => {
  assert.deepEqual(names("\x1b[A\x1b[B\x1bOA\x1bOB"), ["up", "down", "up", "down"]);
  assert.deepEqual(names("\x1b[H\x1b[F\x1bOH\x1bOF\x1b[1~\x1b[4~\x1b[7~\x1b[8~"), ["home", "end", "home", "end", "home", "end", "home", "end"]);
  assert.deepEqual(names("\x1b[5~\x1b[6~\x1b[1;5A"), ["page-up", "page-down", "up"]);
});

test("escape", () => {
  assert.deepEqual(names("\x1b"), ["escape"]);
  assert.deepEqual(names("\x1b\x1b"), ["escape", "escape"]);
  // Alt+x
  assert.deepEqual(names("\x1bx"), ["escape"]);
});

test("mouse wheel", () => {
  assert.deepEqual(names("\x1b[<64;10;5M\x1b[<65;10;5M"), ["scroll-up", "scroll-down"]);
  // Clicks and releases are ignored.
  assert.deepEqual(names("\x1b[<0;10;5M\x1b[<0;10;5m"), []);
  // The old X10 encoding.
  assert.deepEqual(names("\x1b[M`!!\x1b[Ma!!"), ["scroll-up", "scroll-down"]);
});

test("unknown sequences don't produce keys", () => {
  assert.deepEqual(names("\x1b[200~x"), ["x"]);
  assert.deepEqual(names("\x1b[?1;2c"), []);
});
