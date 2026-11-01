// One exercise: its file, its state, and how to check it.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Checker } from "./checker.ts";
import { exerciseDir, type ExerciseInfo, exercisePath, solutionPath } from "./info-file.ts";
import { runExerciseFile } from "./pipeline.ts";
import { renderProblems } from "./render.ts";
import { filePath, paint } from "./term.ts";

export interface Exercise extends ExerciseInfo {
  /** `exercises/<dir>/<name>.ts`, relative to the directory tslings runs in. */
  readonly path: string;
  /** The absolute path with symlinks resolved, for terminal hyperlinks. */
  readonly canonicalPath: string | undefined;
  done: boolean;
}

export function createExercise(info: ExerciseInfo, canonicalExercisesDir: string | undefined): Exercise {
  const path = exercisePath(info);
  return {
    ...info,
    path,
    canonicalPath:
      canonicalExercisesDir === undefined ? undefined : resolve(canonicalExercisesDir, path.slice("exercises/".length)),
    done: false,
  };
}

/** The exercise path, clickable in terminals that support hyperlinks. */
export function exerciseLink(exercise: Exercise, emitFileLinks: boolean): string {
  return filePath(exercise.path, emitFileLinks ? exercise.canonicalPath : undefined, "blue");
}

/** `Solution for comparison: solutions/…` */
export function solutionLinkLine(solutionFile: string, emitFileLinks: boolean): string {
  const link = filePath(solutionFile, emitFileLinks ? resolve(solutionFile) : undefined, "cyan");
  return `${paint("bold", "Solution")} for comparison: ${link}\n`;
}

/** Paths of the extra files of an exercise in `exercises/` or `solutions/`. */
export function extraFilePaths(base: "exercises" | "solutions", exercise: ExerciseInfo): string[] {
  return exercise.extraFiles.map((file) => `${exerciseDir(base, exercise)}/${file}`);
}

export interface RunOutcome {
  readonly success: boolean;
  /** What the learner sees: type errors, lints, test results or the program's output. */
  readonly output: string;
}

/**
 * Checks exercises: type-check, lint, then run. Equivalent of rustlings'
 * `CmdRunner` + `run_exercise`, with one TypeScript project kept open for the
 * whole session so that re-checking a file takes milliseconds.
 */
export class ExerciseRunner {
  readonly #configPath: string;
  readonly #root: string;
  #checker: Checker | undefined;

  /**
   * @param configPath The tsconfig that includes every exercise and solution.
   * @param root The directory paths in the output are relative to.
   */
  constructor(configPath: string, root: string = process.cwd()) {
    this.#configPath = configPath;
    this.#root = root;
  }

  /** Started on first use: commands like `hint` never need TypeScript. */
  get #lazyChecker(): Checker {
    this.#checker ??= new Checker(this.#configPath);
    return this.#checker;
  }

  /** Check the exercise file. */
  runExercise(exercise: ExerciseInfo, options: { readonly color: boolean }): Promise<RunOutcome> {
    return this.#run(exercise, exercisePath(exercise), exercise.strictLint, options.color);
  }

  /** Check the exercise's solution. Solutions must pass with style lints as errors. */
  runSolution(exercise: ExerciseInfo, options: { readonly color: boolean }): Promise<RunOutcome> {
    return this.#run(exercise, solutionPath(exercise), true, options.color);
  }

  /** Type-check and lint a file without running it (used for extra files). */
  checkOnly(file: string, options: { readonly strictLint: boolean; readonly color: boolean }): RunOutcome {
    const path = resolve(this.#root, file);
    const { problems, ok } = this.#lazyChecker.check(path, { strictLint: options.strictLint });
    const output =
      problems.length === 0
        ? ""
        : renderProblems(problems, new Map([[path, readFileSync(path, "utf8")]]), { cwd: this.#root, color: options.color });
    return { success: ok, output };
  }

  async #run(exercise: ExerciseInfo, file: string, strictLint: boolean, color: boolean): Promise<RunOutcome> {
    const path = resolve(this.#root, file);
    if (!existsSync(path)) {
      return { success: false, output: `${paint(["bold", "red"], "error", color)}: the file ${file} doesn't exist\n` };
    }

    const base = file.startsWith("solutions/") ? "solutions" : "exercises";
    const result = await runExerciseFile(this.#lazyChecker, path, {
      test: exercise.test,
      cwd: this.#root,
      color,
      strictLint,
      allowLints: exercise.allowLints,
      // Imported sibling modules may have changed too.
      extraFiles: extraFilePaths(base, exercise).map((extra) => resolve(this.#root, extra)),
      notes: exercise.errorNotes,
    });
    return { success: result.success, output: result.output };
  }

  close(): void {
    this.#checker?.close();
    this.#checker = undefined;
  }
}
