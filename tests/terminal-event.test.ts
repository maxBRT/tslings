import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeKeys } from "../src/input.ts";
import { InputPause, type WatchEvent } from "../src/watch/events.ts";
import { TerminalEventHandler } from "../src/watch/terminal-event.ts";

/** A handler, and the inputs it sent for what was typed. */
function setUp(manualRun: boolean): { handler: TerminalEventHandler; pause: InputPause; type: (keys: string) => string[] } {
  const sent: string[] = [];
  const pause = new InputPause();
  const send = (event: WatchEvent): void => {
    if (event.kind === "input") sent.push(event.input);
  };
  const handler = new TerminalEventHandler(pause, manualRun, send);
  const type = (keys: string): string[] => {
    for (const key of decodeKeys(keys)) handler.handleKey(key);
    return sent.splice(0);
  };
  return { handler, pause, type };
}

test("watch mode keys", () => {
  const { type } = setUp(false);
  assert.deepEqual(type("nhzr"), ["next", "hint"], "`r` only runs with --manual-run, other keys do nothing");
  assert.deepEqual(setUp(true).type("r"), ["run"]);
  assert.deepEqual(type("qn"), ["quit"], "nothing after quitting");
  assert.deepEqual(setUp(false).type("lh"), ["list"], "nothing after leaving for the list");
});

test("keys are ignored while an exercise is checked", async () => {
  const { pause, type } = setUp(false);
  await pause.during(async () => {
    assert.deepEqual(type("nhxq"), []);
  });
  assert.deepEqual(type("h"), ["hint"]);
});

test("the reset prompt takes one answer, then waits until it was handled", () => {
  const { handler, type } = setUp(false);
  assert.deepEqual(type("x"), ["reset"]);
  assert.deepEqual(type("qhN"), ["cancel"], "only `y` and `n` answer");

  handler.unpause();
  assert.deepEqual(type("x"), ["reset"]);
  assert.deepEqual(type("yyn"), ["confirm"], "a second answer doesn't reset again");
  handler.unpause();
  assert.deepEqual(type("h"), ["hint"]);
});
