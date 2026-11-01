// One exercise: its file, its state, and how to check it.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Checker } from "./checker.js";
import { exerciseDir, exercisePath, solutionPath } from "./info-file.js";
import { runExerciseFile } from "./pipeline.js";
import { renderProblems } from "./render.js";
import { filePath, paint } from "./term.js";
export function createExercise(info, canonicalExercisesDir) {
    const path = exercisePath(info);
    return {
        ...info,
        path,
        canonicalPath: canonicalExercisesDir === undefined ? undefined : resolve(canonicalExercisesDir, path.slice("exercises/".length)),
        done: false,
    };
}
/** The exercise path, clickable in terminals that support hyperlinks. */
export function exerciseLink(exercise, emitFileLinks) {
    return filePath(exercise.path, emitFileLinks ? exercise.canonicalPath : undefined, "blue");
}
/** `Solution for comparison: solutions/…` */
export function solutionLinkLine(solutionFile, emitFileLinks) {
    const link = filePath(solutionFile, emitFileLinks ? resolve(solutionFile) : undefined, "cyan");
    return `${paint("bold", "Solution")} for comparison: ${link}\n`;
}
/** Paths of the extra files of an exercise in `exercises/` or `solutions/`. */
export function extraFilePaths(base, exercise) {
    return exercise.extraFiles.map((file) => `${exerciseDir(base, exercise)}/${file}`);
}
/**
 * Checks exercises: type-check, lint, then run. Equivalent of rustlings'
 * `CmdRunner` + `run_exercise`, with one TypeScript project kept open for the
 * whole session so that re-checking a file takes milliseconds.
 */
export class ExerciseRunner {
    #configPath;
    #root;
    #checker;
    /**
     * @param configPath The tsconfig that includes every exercise and solution.
     * @param root The directory paths in the output are relative to.
     */
    constructor(configPath, root = process.cwd()) {
        this.#configPath = configPath;
        this.#root = root;
    }
    /** Started on first use: commands like `hint` never need TypeScript. */
    get #lazyChecker() {
        this.#checker ??= new Checker(this.#configPath);
        return this.#checker;
    }
    /** Check the exercise file. */
    runExercise(exercise, options) {
        return this.#run(exercise, exercisePath(exercise), exercise.strictLint, options);
    }
    /** Check the exercise's solution. Solutions must pass with style lints as errors. */
    runSolution(exercise, options) {
        return this.#run(exercise, solutionPath(exercise), true, options);
    }
    /** Type-check and lint a file without running it (used for extra files). */
    checkOnly(file, options) {
        const path = resolve(this.#root, file);
        const { problems, ok } = this.#lazyChecker.check(path, { strictLint: options.strictLint });
        const output = problems.length === 0
            ? ""
            : renderProblems(problems, new Map([[path, readFileSync(path, "utf8")]]), { cwd: this.#root, color: options.color });
        return { success: ok, output };
    }
    async #run(exercise, file, strictLint, options) {
        const { color } = options;
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
            ...(options.maxProblems === undefined ? {} : { maxProblems: options.maxProblems }),
        });
        return { success: result.success, output: result.output };
    }
    close() {
        this.#checker?.close();
        this.#checker = undefined;
    }
}
