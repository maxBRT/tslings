// The state of the learner's progress: which exercise is current, which are
// done, and the actions that change them. Saved in `.tslings-state.txt`.

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import type { Editor } from "./editor.ts";
import { createExercise, type Exercise, type ExerciseRunner } from "./exercise.ts";
import { type ExerciseInfo, solutionPath } from "./info-file.ts";
import { restoreMissingFiles, writeExerciseToDisk, writeSolutionToDisk } from "./package-files.ts";
import { checkParallelism, runPool } from "./pool.ts";
import {
  type CheckProgress,
  CheckProgressVisualizer,
  clearTerminal,
  paint,
  stdoutColor,
  stdoutIsTerminal,
  terminalSize,
  write,
} from "./term.ts";
import type { ExerciseSource } from "./workspace.ts";

export const STATE_FILE_NAME = ".tslings-state.txt";
const STATE_FILE_HEADER = "DON'T EDIT THIS FILE!\n\n";
const BAD_INDEX_ERR = "The current exercise index is higher than the number of exercises";

export type ExercisesProgress =
  /** All exercises are done. */
  | "all-done"
  /** A new exercise is now pending. */
  | "new-pending"
  /** The current exercise is still pending. */
  | "current-pending";

/** Whether the state file existed with valid content. The welcome message is only shown when it didn't. */
export type StateFileStatus = "read" | "not-read";

export interface AppStateOptions {
  readonly exercises: readonly ExerciseInfo[];
  readonly finalMessage: string;
  readonly source: ExerciseSource;
  readonly runner: ExerciseRunner;
  readonly editor: Editor | undefined;
  /** VS Code's terminal handles file links itself. */
  readonly vsCodeTerm: boolean;
}

/** The content of the state file: the current exercise, then the done exercises. */
export interface SavedState {
  readonly currentExercise: string;
  readonly doneExercises: ReadonlySet<string>;
}

/**
 * The file format is very simple:
 * - The first line is a comment.
 * - The second line is empty.
 * - The third line is the name of the current exercise.
 * - The fourth line is empty.
 * - All remaining lines are the names of done exercises.
 */
export function parseStateFile(content: string): SavedState | undefined {
  const lines = content.split("\n").slice(2);
  const [currentExercise, separator, ...doneLines] = lines;
  if (currentExercise === undefined || currentExercise === "" || separator === undefined) {
    return undefined;
  }
  const doneExercises = new Set<string>();
  for (const line of doneLines) {
    if (line === "") break;
    doneExercises.add(line);
  }
  return { currentExercise, doneExercises };
}

export function serializeStateFile(currentExercise: string, doneExercises: Iterable<string>): string {
  let content = `${STATE_FILE_HEADER}${currentExercise}\n`;
  for (const name of doneExercises) content += `\n${name}`;
  return content;
}

export class AppState {
  #currentExerciseInd = 0;
  readonly #exercises: Exercise[];
  // Cached so that rendering doesn't count the done exercises every time.
  #nDone = 0;
  readonly #finalMessage: string;
  readonly #source: ExerciseSource;
  readonly runner: ExerciseRunner;
  readonly #editor: Editor | undefined;
  /** Hyperlinks to files, except in VS Code's terminal which links paths itself. */
  readonly emitFileLinks: boolean;

  private constructor(options: AppStateOptions) {
    const canonicalExercisesDir = canonicalize("exercises");
    this.#exercises = options.exercises.map((info) => createExercise(info, canonicalExercisesDir));
    this.#finalMessage = options.finalMessage;
    this.#source = options.source;
    this.runner = options.runner;
    this.#editor = options.editor;
    this.emitFileLinks = !options.vsCodeTerm && stdoutIsTerminal;
  }

  /** Load the state file, creating it if it doesn't exist yet. */
  static load(options: AppStateOptions): { appState: AppState; stateFileStatus: StateFileStatus } {
    const appState = new AppState(options);

    let content = "";
    try {
      // Opening with "a+" creates the file, so problems show up right away.
      closeSync(openSync(STATE_FILE_NAME, "a+"));
      content = readFileSync(STATE_FILE_NAME, "utf8");
    } catch (error) {
      throw new Error(`Failed to open or create the state file ${STATE_FILE_NAME}`, { cause: error });
    }

    const saved = parseStateFile(content);
    if (saved === undefined) return { appState, stateFileStatus: "not-read" };

    appState.#exercises.forEach((exercise, index) => {
      if (saved.doneExercises.has(exercise.name)) {
        exercise.done = true;
        appState.#nDone++;
      }
      if (exercise.name === saved.currentExercise) appState.#currentExerciseInd = index;
    });
    return { appState, stateFileStatus: "read" };
  }

  get currentExerciseInd(): number {
    return this.#currentExerciseInd;
  }

  get exercises(): readonly Exercise[] {
    return this.#exercises;
  }

  get nDone(): number {
    return this.#nDone;
  }

  get nPending(): number {
    return this.#exercises.length - this.#nDone;
  }

  get currentExercise(): Exercise {
    return this.#exercise(this.#currentExerciseInd);
  }

  #exercise(index: number): Exercise {
    const exercise = this.#exercises[index];
    if (exercise === undefined) throw new Error(BAD_INDEX_ERR);
    return exercise;
  }

  /** Save the current exercise and the done exercises. */
  write(): void {
    const done = this.#exercises.filter((exercise) => exercise.done).map((exercise) => exercise.name);
    try {
      writeFileSync(STATE_FILE_NAME, serializeStateFile(this.currentExercise.name, done));
    } catch (error) {
      throw new Error(`Failed to write the state file ${STATE_FILE_NAME}`, { cause: error });
    }
  }

  setCurrentExerciseInd(index: number): void {
    if (index === this.#currentExerciseInd) return;
    if (index < 0 || index >= this.#exercises.length) throw new Error(BAD_INDEX_ERR);
    this.#currentExerciseInd = index;
    this.write();
  }

  setCurrentExerciseByName(name: string): void {
    const index = this.#exercises.findIndex((exercise) => exercise.name === name);
    if (index === -1) throw new Error(`No exercise found for '${name}'!`);
    this.#currentExerciseInd = index;
    this.write();
  }

  /** Set the status of an exercise without saving. Returns `true` if it changed. */
  setStatus(index: number, done: boolean): boolean {
    const exercise = this.#exercise(index);
    if (exercise.done === done) return false;
    exercise.done = done;
    this.#nDone += done ? 1 : -1;
    return true;
  }

  /** Mark an exercise as pending and save. */
  setPending(index: number): void {
    if (this.setStatus(index, false)) this.write();
  }

  /**
   * Official exercises: copy the original file from the tslings package.
   * Community exercises: reset the exercise file with `git stash`.
   */
  #reset(exercise: Exercise): void {
    if (this.#source === "official") {
      writeExerciseToDisk(exercise);
      return;
    }

    const result = spawnSync("git", ["stash", "push", "--", exercise.path], {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    });
    if (result.error !== undefined) {
      throw new Error(`Failed to run \`git stash push -- ${exercise.path}\``, { cause: result.error });
    }
    if (result.status !== 0) {
      throw new Error(`\`git stash push -- ${exercise.path}\` didn't run successfully: ${result.stderr}`);
    }
  }

  resetCurrentExercise(): void {
    this.setPending(this.#currentExerciseInd);
    this.#reset(this.currentExercise);
  }

  /** Reset an exercise by index and return its name. */
  resetExerciseByInd(index: number): string {
    const exercise = this.#exercise(index);
    this.setPending(index);
    this.#reset(exercise);
    return exercise.name;
  }

  /** The index of the next pending exercise after the current one (wrapping around), if any. */
  nextPendingExerciseInd(): number | undefined {
    const after = this.#exercises.findIndex((exercise, index) => index > this.#currentExerciseInd && !exercise.done);
    if (after !== -1) return after;
    const before = this.#exercises.findIndex((exercise, index) => index < this.#currentExerciseInd && !exercise.done);
    return before === -1 ? undefined : before;
  }

  /**
   * Official exercises: copy the solution from the package and return its path.
   * Community exercises: return the path of the solution file if it exists.
   */
  currentSolutionPath(): string | undefined {
    const exercise = this.currentExercise;
    if (this.#source === "official") return writeSolutionToDisk(exercise);
    const path = solutionPath(exercise);
    return existsSync(path) ? path : undefined;
  }

  /** Official exercises: bring back files the learner deleted, before running the exercise. */
  restoreCurrentExerciseFiles(): void {
    if (this.#source === "official") restoreMissingFiles(this.currentExercise);
  }

  /**
   * Check all exercises in parallel with a live progress grid, update their
   * status and return the index of the first pending exercise, if any.
   */
  async checkAllExercises(): Promise<number | undefined> {
    const visualizer = new CheckProgressVisualizer(this.#exercises.length, terminalSize());
    visualizer.start();
    const progresses: CheckProgress[] = this.#exercises.map(() => "none");

    const runOne = async (index: number): Promise<void> => {
      if (this.#source === "official") restoreMissingFiles(this.#exercise(index));
      progresses[index] = "checking";
      visualizer.update(progresses);
      try {
        const { success } = await this.runner.runExercise(this.#exercise(index), { color: false });
        progresses[index] = success ? "done" : "pending";
      } catch {
        // Retried one by one below.
        progresses[index] = "none";
      }
      visualizer.update(progresses);
    };

    try {
      await runPool(this.#exercises.length, checkParallelism(), runOne);

      // If something failed while checking in parallel (too many open files?),
      // try again sequentially and let errors through this time.
      for (const [index, progress] of progresses.entries()) {
        if (progress !== "none" && progress !== "checking") continue;
        progresses[index] = "checking";
        visualizer.update(progresses);
        const { success } = await this.runner.runExercise(this.#exercise(index), { color: false });
        progresses[index] = success ? "done" : "pending";
        visualizer.update(progresses);
      }
    } finally {
      visualizer.finish(progresses);
    }

    let firstPending: number | undefined;
    for (const [index, progress] of progresses.entries()) {
      const done = progress === "done";
      this.setStatus(index, done);
      if (!done) firstPending ??= index;
    }
    this.write();
    return firstPending;
  }

  /**
   * Mark the current exercise as done and move on to the next pending one, if
   * any. When all exercises are marked as done, check all of them to make sure
   * they really are: an exercise that fails becomes the current one.
   */
  async doneCurrentExercise(clearBeforeFinalCheck: boolean): Promise<ExercisesProgress> {
    this.setStatus(this.#currentExerciseInd, true);

    const next = this.nextPendingExerciseInd();
    if (next !== undefined) {
      this.setCurrentExerciseInd(next);
      return "new-pending";
    }

    write(clearBeforeFinalCheck ? clearTerminal() : "\n");

    const firstPending = await this.checkAllExercises();
    if (firstPending !== undefined) {
      this.setCurrentExerciseInd(firstPending);
      return "new-pending";
    }

    this.renderFinalMessage();
    return "all-done";
  }

  renderFinalMessage(): void {
    let out = clearTerminal() + finishLine(stdoutColor);
    const finalMessage = this.#finalMessage.trim();
    if (finalMessage !== "") out += `${finalMessage}\n`;
    write(out);
  }

  /** Show the current exercise in the editor, if there's an editor integration. */
  async openEditor(): Promise<void> {
    await this.#editor?.open(this.#currentExerciseInd, this.currentExercise.path);
  }

  async closeEditor(): Promise<void> {
    await this.#editor?.close();
  }
}

/** Canonicalize a path (absolute, symlinks resolved), or `undefined` if it doesn't exist. */
function canonicalize(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

/** The TypeScript logo, one character pair per pixel: `#` for the letters. */
const LOGO = [
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
  "...#####.####.",
  ".....#..#.....",
  ".....#..#.....",
  ".....#...###..",
  ".....#......#.",
  ".....#......#.",
  ".....#..####..",
  "..............",
];

function finishLine(color: boolean): string {
  const logo = LOGO.map((row) => {
    const pixels = Array.from(row, (pixel) =>
      pixel === "#" ? paint("whiteBright", "██", color) : color ? paint("blue", "██", color) : "░░",
    );
    return `             ${pixels.join("")}\n`;
  }).join("");

  return `+----------------------------------------------------+
|          You made it to the finish line!           |
+--------------------------  ------------------------+
                          \\/
${logo}
`;
}
