import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { before, describe, test } from "node:test";
import { AppState, parseStateFile, serializeStateFile, STATE_FILE_NAME } from "../src/app-state.ts";
import { ExerciseRunner } from "../src/exercise.ts";
import type { ExerciseInfo } from "../src/info-file.ts";
import { temporaryDir } from "./helpers.ts";

function info(name: string): ExerciseInfo {
  return {
    name,
    dir: undefined,
    test: true,
    strictLint: false,
    allowLints: [],
    hint: "",
    skipCheckUnsolved: false,
    errorNotes: {},
    extraFiles: [],
  };
}

function load(names: readonly string[]): ReturnType<typeof AppState.load> {
  return AppState.load({
    exercises: names.map(info),
    finalMessage: "",
    source: "community",
    runner: new ExerciseRunner("unused/tsconfig.json"),
    editor: undefined,
    vsCodeTerm: false,
  });
}

describe("state file format", () => {
  test("parse", () => {
    const saved = parseStateFile("DON'T EDIT THIS FILE!\n\nintro2\n\nintro1\nvariables1");
    assert.equal(saved?.currentExercise, "intro2");
    assert.deepEqual([...(saved?.doneExercises ?? [])], ["intro1", "variables1"]);
  });

  test("the current exercise line must end with a newline", () => {
    assert.equal(parseStateFile("DON'T EDIT THIS FILE!\n\nintro2"), undefined);
    assert.equal(parseStateFile(""), undefined);
    assert.equal(parseStateFile("DON'T EDIT THIS FILE!\n\n\n\nintro1"), undefined);
  });

  test("done exercises stop at the first empty line", () => {
    const saved = parseStateFile("DON'T EDIT THIS FILE!\n\na\n\nb\n\nc");
    assert.deepEqual([...(saved?.doneExercises ?? [])], ["b"]);
  });

  test("serialize", () => {
    assert.equal(serializeStateFile("b", ["a", "c"]), "DON'T EDIT THIS FILE!\n\nb\n\na\nc");
    assert.equal(serializeStateFile("a", []), "DON'T EDIT THIS FILE!\n\na\n");
  });
});

describe("AppState", () => {
  before(() => process.chdir(temporaryDir()));

  test("a missing state file is created and reported as not read", () => {
    const { appState, stateFileStatus } = load(["a", "b"]);
    assert.equal(stateFileStatus, "not-read");
    assert.equal(readFileSync(STATE_FILE_NAME, "utf8"), "");
    assert.equal(appState.currentExerciseInd, 0);
    assert.equal(appState.nDone, 0);
  });

  test("reads and writes the progress", () => {
    writeFileSync(STATE_FILE_NAME, "DON'T EDIT THIS FILE!\n\nb\n\na\nunknown");
    const { appState, stateFileStatus } = load(["a", "b", "c"]);
    assert.equal(stateFileStatus, "read");
    assert.equal(appState.currentExercise.name, "b");
    assert.deepEqual(appState.exercises.map((exercise) => exercise.done), [true, false, false]);
    assert.equal(appState.nDone, 1);
    assert.equal(appState.nPending, 2);

    appState.setStatus(2, true);
    appState.setCurrentExerciseByName("c");
    assert.equal(readFileSync(STATE_FILE_NAME, "utf8"), "DON'T EDIT THIS FILE!\n\nc\n\na\nc");

    appState.setPending(0);
    assert.equal(readFileSync(STATE_FILE_NAME, "utf8"), "DON'T EDIT THIS FILE!\n\nc\n\nc");
  });

  test("unknown exercise names are an error", () => {
    const { appState } = load(["a"]);
    assert.throws(() => appState.setCurrentExerciseByName("nope"), /No exercise found for 'nope'!/);
    assert.throws(() => appState.setCurrentExerciseInd(5), /index is higher than the number of exercises/);
  });

  test("next pending exercise (ported from rustlings)", () => {
    const { appState } = load(["0", "1", "2"]);
    const check = (done: [boolean, boolean, boolean], expected: [number | undefined, number | undefined, number | undefined]): void => {
      done.forEach((value, index) => appState.setStatus(index, value));
      expected.forEach((next, index) => {
        appState.setCurrentExerciseInd(index);
        assert.equal(appState.nextPendingExerciseInd(), next, `done=${JSON.stringify(done)}, index=${index}`);
      });
    };

    check([true, true, true], [undefined, undefined, undefined]);
    check([false, false, false], [1, 2, 0]);
    check([false, true, true], [undefined, 0, 0]);
    check([true, false, true], [1, undefined, 1]);
    check([true, true, false], [2, 2, undefined]);
    check([true, false, false], [1, 2, 1]);
    check([false, true, false], [2, 2, 0]);
    check([false, false, true], [1, 0, 0]);
  });
});
