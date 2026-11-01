import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CheckProgressVisualizer, LineWriter, progressBar, supportsColor, terminalFileLink } from "../src/term.ts";

describe("progress bar", () => {
  test("fills the terminal width", () => {
    const bar = progressBar(12, 110, 40, false);
    assert.equal(bar, "Progress: [##>-----------------]  12/110");
    assert.equal(bar.length, 40);
  });

  test("empty and full", () => {
    assert.equal(progressBar(0, 10, 30, false), "Progress: [>---------]   0/10");
    assert.equal(progressBar(10, 10, 30, false), "Progress: [##########]  10/10");
  });

  test("narrow terminals get a counter", () => {
    assert.equal(progressBar(3, 10, 23, false), "Progress: 3/10");
  });

  test("colours", () => {
    assert.equal(progressBar(1, 2, 26, true), "Progress: [\x1b[32m###>\x1b[39m\x1b[31m--\x1b[39m]   1/2");
  });
});

describe("LineWriter", () => {
  test("cuts text at the maximum width, not escape sequences", () => {
    const line = new LineWriter(8, true).text("abc", "red").raw("\x1b[7m").text("défghij").toString();
    assert.equal(line, "\x1b[31mabc\x1b[39m\x1b[7mdéfgh");
  });

  test("wide characters can be counted", () => {
    const writer = new LineWriter(4, false).raw("🦀").addWidth(2).text("abc");
    assert.equal(writer.toString(), "🦀ab");
    assert.equal(writer.length, 4);
  });
});

test("terminal file links (OSC 8)", () => {
  assert.equal(terminalFileLink("x.ts", "/home/me/x.ts"), "\x1b]8;;file:///home/me/x.ts\x1b\\x.ts\x1b]8;;\x1b\\");
});

test("colour detection respects NO_COLOR, FORCE_COLOR and non-terminals", () => {
  const tty = { isTTY: true, hasColors: () => true };
  const pipe = { isTTY: false, hasColors: () => true };
  assert.equal(supportsColor(tty, {}), true);
  assert.equal(supportsColor(tty, { NO_COLOR: "1" }), false);
  assert.equal(supportsColor(pipe, {}), false);
  assert.equal(supportsColor(pipe, { FORCE_COLOR: "1" }), true);
  assert.equal(supportsColor(tty, { FORCE_COLOR: "0" }), false);
});

test("check progress grid", () => {
  const visualizer = new CheckProgressVisualizer(5, { columns: 15, rows: 24 }, false, false);
  assert.equal(visualizer.grid(["done", "pending", "checking", "none", "done"]), "  1✓   2✗   3?\n  4    5✓");
  const colored = new CheckProgressVisualizer(2, { columns: 15, rows: 24 }, false, true);
  assert.equal(colored.grid(["done", "pending"]), "\x1b[32m  1\x1b[39m \x1b[31m  2\x1b[39m");
});

test("the check progress grid is only redrawn live when it fits on the screen", () => {
  // 121 exercises, 25 per line at 100 columns: 5 lines, plus the title and the legend.
  assert.equal(new CheckProgressVisualizer(121, { columns: 100, rows: 7 }, true, true).live, true);
  assert.equal(new CheckProgressVisualizer(121, { columns: 100, rows: 6 }, true, true).live, false);
  assert.equal(new CheckProgressVisualizer(3, { columns: 80, rows: 24 }, false, true).live, false, "never without a terminal");
  // At 30 columns, the legend takes two lines, then 18 lines of 7 numbers.
  assert.equal(new CheckProgressVisualizer(121, { columns: 30, rows: 21 }, true, true).live, true);
  assert.equal(new CheckProgressVisualizer(121, { columns: 30, rows: 20 }, true, true).live, false);
});
