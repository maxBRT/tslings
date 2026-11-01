// The file watcher, on real files: every way of saving a file must rerun the exercise.

import assert from "node:assert/strict";
import { mkdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createExercise } from "../src/exercise.ts";
import type { ExerciseInfo } from "../src/info-file.ts";
import { InputPause, type WatchEvent } from "../src/watch/events.ts";
import { watchExercises } from "../src/watch/file-watcher.ts";
import { temporaryDir } from "./helpers.ts";

function info(name: string, dir: string | undefined, extraFiles: string[] = []): ExerciseInfo {
  return {
    name,
    dir,
    test: true,
    strictLint: false,
    allowLints: [],
    hint: "",
    skipCheckUnsolved: false,
    errorNotes: {},
    extraFiles,
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** A watcher on a temporary `exercises/` directory, and the exercises it reported as changed. */
function setUp(): { root: string; changes: number[]; pause: InputPause; close: () => void } {
  const root = temporaryDir();
  mkdirSync(join(root, "exercises", "01_basics"), { recursive: true });
  for (const file of ["01_basics/basics1.ts", "01_basics/basics2.ts", "01_basics/shapes.ts", "top.ts"]) {
    writeFileSync(join(root, "exercises", file), "// TODO\n");
  }
  const exercises = [info("basics1", "01_basics"), info("basics2", "01_basics", ["shapes.ts"]), info("top", undefined)].map(
    (exercise) => createExercise(exercise, undefined),
  );

  const changes: number[] = [];
  const pause = new InputPause();
  const send = (event: WatchEvent): void => {
    if (event.kind === "file-change") changes.push(event.exerciseInd);
  };
  const watcher = watchExercises(exercises, pause, send, root);
  return { root, changes, pause, close: () => watcher.close() };
}

/** Wait for the debounced change events, then return them and start over. */
async function takeChanges(changes: number[]): Promise<number[]> {
  for (let waited = 0; waited < 2000 && changes.length === 0; waited += 50) await sleep(50);
  // Let a burst of events settle.
  await sleep(300);
  return changes.splice(0).sort();
}

test("the file watcher sees every way of saving a file", { timeout: 30_000 }, async () => {
  const { root, changes, close } = setUp();
  const file = (path: string): string => join(root, "exercises", path);
  try {
    writeFileSync(file("01_basics/basics1.ts"), "// in place\n");
    assert.deepEqual(await takeChanges(changes), [0]);

    // Editors that save "atomically" write a temporary file and rename it over the old one.
    for (const content of ["// first save\n", "// second save\n"]) {
      writeFileSync(file("01_basics/.basics1.ts.tmp"), content);
      renameSync(file("01_basics/.basics1.ts.tmp"), file("01_basics/basics1.ts"));
      assert.deepEqual(await takeChanges(changes), [0]);
    }
    // In place again, after the file was replaced.
    writeFileSync(file("01_basics/basics1.ts"), "// in place again\n");
    assert.deepEqual(await takeChanges(changes), [0]);

    // `git stash` deletes the file and creates a new one.
    unlinkSync(file("top.ts"));
    writeFileSync(file("top.ts"), "// reset\n");
    assert.deepEqual(await takeChanges(changes), [2]);

    // An extra file belongs to its exercise.
    writeFileSync(file("01_basics/shapes.ts"), "// shapes\n");
    assert.deepEqual(await takeChanges(changes), [1]);
  } finally {
    close();
  }
});

test("the file watcher keeps working when a chapter directory is created again", { timeout: 30_000 }, async () => {
  const { root, changes, close } = setUp();
  try {
    rmSync(join(root, "exercises", "01_basics"), { recursive: true });
    await sleep(100);
    mkdirSync(join(root, "exercises", "01_basics"));
    await sleep(100);
    writeFileSync(join(root, "exercises", "01_basics", "basics2.ts"), "// restored\n");
    assert.deepEqual(await takeChanges(changes), [1]);
  } finally {
    close();
  }
});

test("the file watcher ignores changes while an exercise runs, and deleted files", { timeout: 30_000 }, async () => {
  const { root, changes, pause, close } = setUp();
  try {
    await pause.during(async () => {
      writeFileSync(join(root, "exercises", "top.ts"), "// while running\n");
      await sleep(100);
    });
    unlinkSync(join(root, "exercises", "01_basics", "basics1.ts"));
    await sleep(500);
    assert.deepEqual(changes, []);
  } finally {
    close();
  }
});
