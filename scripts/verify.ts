// Verify exercises while authoring them, before the CLI's `dev check` exists.
//
//   node scripts/verify.ts curriculum/07_unions.toml          # check a chapter
//   node scripts/verify.ts curriculum/07_unions.toml --show   # also print outputs
//   node scripts/verify.ts curriculum/07_unions.toml unions2  # one exercise
//
// For each exercise of the chapter file, it checks that:
//   - the exercise in `exercises/` FAILS (unless `skip_check_unsolved = true`)
//   - the solution in `solutions/` PASSES, with style lints as errors

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse } from "smol-toml";
import { Checker } from "../src/checker.ts";
import { runExerciseFile } from "../src/pipeline.ts";

interface ExerciseEntry {
  name: string;
  dir: string;
  test?: boolean;
  strict_lint?: boolean;
  allow_lints?: string[];
  hint: string;
  skip_check_unsolved?: boolean;
  error_notes?: Record<string, string>;
  extra_files?: string[];
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { show: { type: "boolean", default: false } },
});
const [chapterFile, only] = positionals;
if (chapterFile === undefined) {
  console.error("usage: node scripts/verify.ts curriculum/<chapter>.toml [exercise] [--show]");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "..");
const chapter = parse(readFileSync(chapterFile, "utf8")) as { exercises?: ExerciseEntry[] };
const exercises = (chapter.exercises ?? []).filter((exercise) => only === undefined || exercise.name === only);
if (exercises.length === 0) {
  console.error("No exercises found.");
  process.exit(2);
}

const checker = new Checker(join(root, ".tslings/tsconfig.json"));
let failures = 0;

for (const exercise of exercises) {
  const problems: string[] = [];
  if (typeof exercise.hint !== "string" || exercise.hint.trim() === "") problems.push("missing hint");
  if (!/^[a-z][a-z0-9_]*$/.test(exercise.name)) problems.push(`bad name ${exercise.name}`);

  for (const extra of exercise.extra_files ?? []) {
    for (const base of ["exercises", "solutions"]) {
      if (!existsSync(join(root, base, exercise.dir, extra))) problems.push(`missing ${base}/${exercise.dir}/${extra}`);
    }
  }

  const options = {
    test: exercise.test ?? true,
    cwd: root,
    color: true,
    allowLints: exercise.allow_lints ?? [],
    ...(exercise.error_notes === undefined ? {} : { notes: exercise.error_notes }),
  };

  const exercisePath = join(root, "exercises", exercise.dir, `${exercise.name}.ts`);
  const solutionPath = join(root, "solutions", exercise.dir, `${exercise.name}.ts`);

  let unsolvedOutput = "";
  if (!existsSync(exercisePath)) {
    problems.push(`missing ${exercisePath}`);
  } else {
    const unsolved = await runExerciseFile(checker, exercisePath, { ...options, strictLint: exercise.strict_lint ?? false });
    unsolvedOutput = unsolved.output;
    if (unsolved.success && exercise.skip_check_unsolved !== true) {
      problems.push("the exercise PASSES already, it must fail until the learner fixes it");
    }
  }

  let solutionOutput = "";
  if (!existsSync(solutionPath)) {
    problems.push(`missing ${solutionPath}`);
  } else {
    const solved = await runExerciseFile(checker, solutionPath, { ...options, strictLint: true });
    solutionOutput = solved.output;
    if (!solved.success) problems.push(`the solution FAILS at the ${solved.failedStep} step`);
  }

  const status = problems.length === 0 ? "\x1b[32mok\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`${status} ${exercise.dir}/${exercise.name}`);
  for (const problem of problems) console.log(`   - ${problem}`);
  if (problems.length > 0 || values.show) {
    console.log(`\n--- exercise output (${exercise.name}) ---\n${unsolvedOutput}`);
    console.log(`--- solution output (${exercise.name}) ---\n${solutionOutput}`);
  }
  if (problems.length > 0) failures++;
}

checker.close();
console.log(failures === 0 ? `\nAll ${exercises.length} exercises OK` : `\n${failures} exercise(s) with problems`);
process.exit(failures === 0 ? 0 : 1);
