// The official exercise files shipped in the tslings package, and how they get
// to the learner's directory. (rustlings embeds them in its binary instead.)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { extraFilePaths } from "./exercise.js";
import { exerciseDir, exercisePath, solutionPath } from "./info-file.js";
import { packageFile } from "./package.js";
function copyFromPackage(relativePath) {
    mkdirSync(dirname(relativePath), { recursive: true });
    try {
        copyFileSync(packageFile(relativePath), relativePath);
    }
    catch (error) {
        throw new Error(`Failed to write the file ${relativePath}`, { cause: error });
    }
}
/** Copy a file only if the package has it (chapter READMEs are optional for community forks). */
function copyFromPackageIfExists(relativePath) {
    if (existsSync(packageFile(relativePath)))
        copyFromPackage(relativePath);
}
/** Create `exercises/` with every exercise, its chapter README and its extra files. */
export function initExercisesDir(exercises) {
    mkdirSync("exercises");
    copyFromPackageIfExists("exercises/README.md");
    const dirs = new Set(exercises.map((exercise) => exerciseDir("exercises", exercise)));
    for (const dir of dirs) {
        mkdirSync(dir, { recursive: true });
        copyFromPackageIfExists(`${dir}/README.md`);
    }
    for (const exercise of exercises) {
        copyFromPackage(exercisePath(exercise));
        for (const extra of extraFilePaths("exercises", exercise))
            copyFromPackage(extra);
    }
}
/** Reset an exercise to its original content, with its extra files. */
export function writeExerciseToDisk(exercise) {
    copyFromPackageIfExists(`${exerciseDir("exercises", exercise)}/README.md`);
    copyFromPackage(exercisePath(exercise));
    for (const extra of extraFilePaths("exercises", exercise))
        copyFromPackage(extra);
}
/**
 * Before each check: bring the exercise file back if it's missing (deleted by
 * the learner, or added by a tslings update), and rewrite its extra files from
 * the package, like rustlings does with its input files. tslings provides the
 * extra files: editing them must not make an exercise pass. Returns the extra
 * files that had been edited.
 */
export function restoreExerciseFiles(exercise) {
    const path = exercisePath(exercise);
    if (!existsSync(path))
        copyFromPackage(path);
    const edited = [];
    for (const extra of extraFilePaths("exercises", exercise)) {
        const original = readFileSync(packageFile(extra));
        const current = readIfExists(extra);
        if (current?.equals(original) === true)
            continue;
        mkdirSync(dirname(extra), { recursive: true });
        try {
            writeFileSync(extra, original);
        }
        catch (error) {
            throw new Error(`Failed to restore the file ${extra}`, { cause: error });
        }
        if (current !== undefined)
            edited.push(extra);
    }
    return edited;
}
function readIfExists(path) {
    try {
        return readFileSync(path);
    }
    catch {
        return undefined;
    }
}
/** Copy the official solution next to the learner's exercises and return its path. */
export function writeSolutionToDisk(exercise) {
    const path = solutionPath(exercise);
    copyFromPackage(path);
    // The solution imports the same sibling modules as the exercise.
    for (const extra of extraFilePaths("solutions", exercise)) {
        if (!existsSync(extra))
            copyFromPackage(extra);
    }
    return path;
}
