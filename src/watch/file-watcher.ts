// Detect saved exercise files: rerun the current exercise when its file (or one
// of its extra files) changes.

import { existsSync, statSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import type { Exercise } from "../exercise.ts";
import { extraFilePaths } from "../exercise.ts";
import type { InputPause, WatchEvent } from "./events.ts";

const DEBOUNCE_MS = 200;

/** Which exercises each file under `exercises/` belongs to, keyed by its path relative to `exercises/`. */
export function exerciseFileMap(exercises: readonly Exercise[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const add = (path: string, index: number): void => {
    const key = path.slice("exercises/".length);
    map.set(key, [...(map.get(key) ?? []), index]);
  };
  exercises.forEach((exercise, index) => {
    add(exercise.path, index);
    for (const extra of extraFilePaths("exercises", exercise)) add(extra, index);
  });
  return map;
}

export interface ExerciseWatcher {
  close(): void;
}

/** The directory of a key of `exerciseFileMap`: `"02_functions"`, or `""` for `exercises/` itself. */
function directoryOf(key: string): string {
  const slash = key.lastIndexOf("/");
  return slash === -1 ? "" : key.slice(0, slash);
}

function isDirectory(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
}

/**
 * Watch `exercises/` and its chapter directories. Bursts of events (editors
 * often write a file in several steps) are merged: each changed exercise is
 * reported once, 200 ms after the last event.
 *
 * Each directory gets its own watcher, instead of one `recursive: true`
 * watcher for everything: on Linux, Node's recursive watcher follows each
 * file, and stops seeing a file once it's replaced by a new one. Many editors
 * save that way (they write a temporary file, then rename it over the old
 * one), and so does `git stash`, which resets community exercises.
 */
export function watchExercises(
  exercises: readonly Exercise[],
  pause: InputPause,
  send: (event: WatchEvent) => void,
  root: string = ".",
): ExerciseWatcher {
  const files = exerciseFileMap(exercises);
  const chapters = new Set([...files.keys()].map(directoryOf).filter((dir) => dir !== ""));
  const watchers = new Map<string, FSWatcher>();
  const updated = new Set<number>();
  let timer: NodeJS.Timeout | undefined;

  const flush = (): void => {
    timer = undefined;
    for (const exerciseInd of updated) send({ kind: "file-change", exerciseInd });
    updated.clear();
  };

  const fileChanged = (key: string): void => {
    const indices = files.get(key);
    // Deleting a file isn't a change worth rerunning for.
    if (pause.paused || indices === undefined || !existsSync(join(root, "exercises", key))) return;

    for (const index of indices) updated.add(index);
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };

  /** Start watching a directory: `""` for `exercises/` itself, or a chapter. */
  const watchDirectory = (dir: string): void => {
    watchers.get(dir)?.close();
    watchers.delete(dir);
    const path = join(root, "exercises", dir);
    if (!isDirectory(path)) return;

    const watcher = watch(path, { persistent: true }, (eventType, filename) => {
      if (filename === null) return;
      if (dir === "" && chapters.has(filename)) {
        // A chapter directory was deleted or created again. The watcher of a
        // deleted directory stops working, so watch the new one.
        if (eventType === "rename") watchDirectory(filename);
        return;
      }
      fileChanged(dir === "" ? filename : `${dir}/${filename}`);
    });
    watcher.on("error", (error) => send({ kind: "watcher-error", error }));
    watchers.set(dir, watcher);
  };

  if (!isDirectory(join(root, "exercises"))) {
    throw new Error("The `exercises/` directory doesn't exist");
  }
  watchDirectory("");
  for (const chapter of chapters) watchDirectory(chapter);

  return {
    close(): void {
      clearTimeout(timer);
      for (const watcher of watchers.values()) watcher.close();
      watchers.clear();
    },
  };
}
