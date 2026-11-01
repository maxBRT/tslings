// The official exercise files shipped in the tslings package, and how they get
// to the learner's directory. (rustlings embeds them in its binary instead.)

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { extraFilePaths } from "./exercise.ts";
import { exerciseDir, type ExerciseInfo, exercisePath, solutionPath } from "./info-file.ts";
import { packageFile } from "./package.ts";

function copyFromPackage(relativePath: string): void {
  mkdirSync(dirname(relativePath), { recursive: true });
  try {
    copyFileSync(packageFile(relativePath), relativePath);
  } catch (error) {
    throw new Error(`Failed to write the file ${relativePath}`, { cause: error });
  }
}

/** Copy a file only if the package has it (chapter READMEs are optional for community forks). */
function copyFromPackageIfExists(relativePath: string): void {
  if (existsSync(packageFile(relativePath))) copyFromPackage(relativePath);
}

/** Create `exercises/` with every exercise, its chapter README and its extra files. */
export function initExercisesDir(exercises: readonly ExerciseInfo[]): void {
  mkdirSync("exercises");
  copyFromPackageIfExists("exercises/README.md");

  const dirs = new Set(exercises.map((exercise) => exerciseDir("exercises", exercise)));
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
    copyFromPackageIfExists(`${dir}/README.md`);
  }

  for (const exercise of exercises) {
    copyFromPackage(exercisePath(exercise));
    for (const extra of extraFilePaths("exercises", exercise)) copyFromPackage(extra);
  }
}

/** Reset an exercise to its original content, with its extra files. */
export function writeExerciseToDisk(exercise: ExerciseInfo): void {
  copyFromPackageIfExists(`${exerciseDir("exercises", exercise)}/README.md`);
  copyFromPackage(exercisePath(exercise));
  for (const extra of extraFilePaths("exercises", exercise)) copyFromPackage(extra);
}

/** Restore an exercise's missing files (deleted by the learner, or added by a tslings update). */
export function restoreMissingFiles(exercise: ExerciseInfo): void {
  for (const path of [exercisePath(exercise), ...extraFilePaths("exercises", exercise)]) {
    if (!existsSync(path)) copyFromPackage(path);
  }
}

/** Copy the official solution next to the learner's exercises and return its path. */
export function writeSolutionToDisk(exercise: ExerciseInfo): string {
  const path = solutionPath(exercise);
  copyFromPackage(path);
  // The solution imports the same sibling modules as the exercise.
  for (const extra of extraFilePaths("solutions", exercise)) {
    if (!existsSync(extra)) copyFromPackage(extra);
  }
  return path;
}
