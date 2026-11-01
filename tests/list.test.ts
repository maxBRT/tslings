import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Exercise } from "../src/exercise.ts";
import { type ListAppState, ListState } from "../src/list/state.ts";
import { ScrollState } from "../src/list/scroll-state.ts";

function exercise(name: string, done: boolean): Exercise {
  return {
    name,
    dir: "ch",
    test: true,
    strictLint: false,
    allowLints: [],
    hint: "",
    skipCheckUnsolved: false,
    errorNotes: {},
    extraFiles: [],
    path: `exercises/ch/${name}.ts`,
    canonicalPath: undefined,
    done,
  };
}

/** An in-memory app state that records what the list asked for. */
class FakeAppState implements ListAppState {
  readonly exercises: Exercise[];
  currentExerciseInd = 0;
  readonly emitFileLinks = false;
  readonly resets: number[] = [];

  constructor(exercises: Exercise[]) {
    this.exercises = exercises;
  }

  get nDone(): number {
    return this.exercises.filter((item) => item.done).length;
  }

  setCurrentExerciseInd(index: number): void {
    this.currentExerciseInd = index;
  }

  resetExerciseByInd(index: number): string {
    this.resets.push(index);
    const reset = this.exercises[index];
    if (reset === undefined) throw new Error("bad index");
    reset.done = false;
    return reset.name;
  }
}

function fixture(): { appState: FakeAppState; state: ListState } {
  const appState = new FakeAppState([
    exercise("intro1", true),
    exercise("intro2", true),
    exercise("variables1", false),
    exercise("variables2", true),
    exercise("functions1", false),
  ]);
  appState.currentExerciseInd = 2;
  return { appState, state: new ListState(appState, 80, 20, false) };
}

/** The visible text of a drawn frame, one string per line. */
function screen(state: ListState): string[] {
  // Cursor movement, clearing and attributes; the frame has no colours (color = false).
  const escapes = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\]8;;[^\x1b]*\x1b\\/g;
  return state
    .draw()
    .split("\x1b[1E")
    .map((line) => line.replace(escapes, "").trimEnd());
}

describe("ListState", () => {
  test("starts on the current exercise", () => {
    const { state } = fixture();
    assert.equal(state.selected, 2);
    const lines = screen(state);
    assert.equal(lines[0], "  Current  State    Name        Path");
    assert.equal(lines[1], "           DONE     intro1      exercises/ch/intro1.ts");
    assert.equal(lines[3], "❯ >>>>>>>  PENDING  variables1  exercises/ch/variables1.ts");
    assert.equal(lines.length, 20);
    assert.match(lines[17] ?? "", /^Progress: \[.*\] {3}3\/5$/);
    assert.equal(lines[18], "↓/j ↑/k home/g end/G │ ↵/continue at │ reset exercise");
    assert.equal(lines[19], "search │ filter done/pending │ quit list");
  });

  test("filters", () => {
    const { state } = fixture();
    state.setFilter("pending");
    assert.deepEqual(state.filteredExercises().map(({ exercise: item }) => item.name), ["variables1", "functions1"]);
    // The selection is kept inside the shorter list.
    assert.equal(state.selected, 1);
    state.setFilter("done");
    assert.deepEqual(state.filteredExercises().map(({ index }) => index), [0, 1, 3]);
  });

  test("search filters the list as the query is typed", () => {
    const { state } = fixture();
    state.setSearchQuery("");
    assert.equal(state.message, "search:|");
    assert.equal(state.selected, 2, "starting a search keeps the selection");

    state.message = "";
    state.setSearchQuery("i");
    assert.deepEqual(state.filteredExercises().map(({ exercise: item }) => item.name), ["intro1", "intro2", "variables1", "variables2", "functions1"]);
    state.setSearchQuery("in");
    assert.deepEqual(state.filteredExercises().map(({ exercise: item }) => item.name), ["intro1", "intro2"]);
    assert.equal(state.selected, 0);
    assert.equal(state.message, "search:i|search:in|");

    state.message = "";
    state.setSearchQuery("nothing");
    assert.equal(state.message, "search:nothing| (not found)");
    assert.equal(state.selected, undefined);
  });

  test("ending a search shows everything again and keeps the selected exercise", () => {
    const { state } = fixture();
    state.setFilter("done");
    state.setSearchQuery("var");
    assert.deepEqual(state.filteredExercises().map(({ index }) => index), [3]);
    state.endSearch();
    assert.equal(state.searchQuery, "");
    assert.deepEqual(state.filteredExercises().map(({ index }) => index), [0, 1, 3]);
    assert.equal(state.selected, 2);
  });

  test("a search that matches nothing keeps the selected exercise for later", () => {
    const { state } = fixture();
    state.setSearchQuery("var");
    state.selectNext();
    assert.equal(state.filteredExercises()[state.selected ?? -1]?.index, 3);
    state.setSearchQuery("varz");
    assert.equal(state.selected, undefined);
    state.endSearch();
    assert.equal(state.selected, 3, "variables2 is selected again");

    state.setSearchQuery("zzz");
    state.setSearchQuery("");
    assert.equal(state.selected, 3, "deleting the whole query selects it again too");
  });

  test("search matches are highlighted", () => {
    const { appState } = fixture();
    const state = new ListState(appState, 80, 20, true);
    state.setSearchQuery("ables");
    assert.match(state.draw(), /vari\x1b\[35mables\x1b\[39m1/);
  });

  test("continue at the selected exercise", () => {
    const { appState, state } = fixture();
    state.setFilter("pending");
    state.selectLast();
    assert.equal(state.selectedToCurrentExercise(), true);
    assert.equal(appState.currentExerciseInd, 4);
  });

  test("reset the selected exercise", () => {
    const { appState, state } = fixture();
    state.setFilter("done");
    state.selectFirst();
    state.resetSelected();
    assert.deepEqual(appState.resets, [0]);
    assert.equal(state.message, "The exercise `intro1` has been reset");
    assert.equal(state.filteredExercises().length, 2);
  });

  test("nothing to select", () => {
    const { appState, state } = fixture();
    for (const item of appState.exercises) item.done = false;
    state.setFilter("done");
    assert.equal(state.selected, undefined);
    assert.equal(state.selectedToCurrentExercise(), false);
    assert.equal(state.message, "Nothing selected to continue at!");
    state.message = "";
    const lines = screen(state);
    assert.equal(lines[18], "filter done/pending │ quit list");
  });

  test("scrolls on small terminals", () => {
    const appState = new FakeAppState(Array.from({ length: 30 }, (_, index) => exercise(`ex${index}`, false)));
    appState.currentExerciseInd = 25;
    const state = new ListState(appState, 60, 10, false);
    const lines = screen(state);
    // 1 header line, 6 rows, 3 footer lines.
    assert.equal(lines.length, 10);
    assert.ok(lines.slice(1, 7).some((line) => line.startsWith("❯ >>>>>>>  PENDING  ex25")));
  });

  test("lines never get wider than the terminal", () => {
    const { state } = fixture();
    state.setTermSize(30, 20);
    for (const line of screen(state)) assert.ok([...line].length <= 30, line);
  });
});

describe("ScrollState", () => {
  test("keeps padding around the selection", () => {
    const scroll = new ScrollState(100, 0, 5);
    scroll.setMaxNRowsToDisplay(20);
    for (let index = 0; index < 20; index++) scroll.selectNext();
    assert.equal(scroll.selected, 20);
    // 20 rows shown, 5 rows of padding below the selection.
    assert.equal(scroll.offset, 6);
    scroll.selectLast();
    assert.equal(scroll.offset, 80);
    scroll.selectFirst();
    assert.equal(scroll.offset, 0);
  });

  test("an empty list has no selection", () => {
    const scroll = new ScrollState(3, 2, 5);
    scroll.setNRows(0);
    assert.equal(scroll.selected, undefined);
    scroll.selectNext();
    assert.equal(scroll.selected, undefined);
    scroll.setNRows(2);
    assert.equal(scroll.selected, 0);
  });
});
