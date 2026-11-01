// `tslings dev check`: make sure community exercises (or the official ones, in
// the tslings repository) are ready to be published.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { ExerciseRunner, extraFilePaths } from "../exercise.ts";
import {
  CURRENT_FORMAT_VERSION,
  exerciseDir,
  type ExerciseInfo,
  exercisePath,
  type InfoFile,
  INFO_FILE_NAME,
  LINT_RULES,
  loadInfoFile,
  solutionPath,
} from "../info-file.ts";
import { parseNoteKey } from "../notes.ts";
import { checkParallelism, runPool } from "../pool.ts";
import { paint, ProgressCounter, stdoutColor, write } from "../term.ts";
import { detectSource, type ExerciseSource, writeCheckerConfig } from "../workspace.ts";
import { assembleInfoToml, hasCurriculum } from "./curriculum.ts";
import { outdatedSetupFiles } from "./update.ts";

const MAX_N_EXERCISES = 999;
const MAX_EXERCISE_NAME_LEN = 32;

const SKIP_CHECK_UNSOLVED_HINT =
  "If this is an introduction exercise that is intended to be already solved, add `skip_check_unsolved = true` to the exercise's metadata in the `info.toml` file";

/** A character that isn't allowed in the exercise's `name` or `dir`. */
function forbiddenChar(input: string): string | undefined {
  return /[^\p{L}\p{N}_]/u.exec(input)?.[0];
}

/** Check the metadata of all exercises and return the paths of the files they own in `exercises/`. */
function checkInfoFileExercises(info: InfoFile, source: ExerciseSource): Set<string> {
  const names = new Set<string>();
  const paths = new Set<string>();
  const warnedReadmes = new Set<string>();

  for (const exercise of info.exercises) {
    const { name } = exercise;
    if (name === "") throw new Error("Found an empty exercise name in `info.toml`");
    if (name.length > MAX_EXERCISE_NAME_LEN) {
      throw new Error(`The length of the exercise name \`${name}\` is bigger than the maximum ${MAX_EXERCISE_NAME_LEN}`);
    }
    const nameChar = forbiddenChar(name);
    if (nameChar !== undefined) throw new Error(`Char \`${nameChar}\` in the exercise name \`${name}\` is not allowed`);

    if (exercise.dir !== undefined) {
      if (exercise.dir === "") throw new Error(`The exercise \`${name}\` has an empty dir name in \`info.toml\``);
      const dirChar = forbiddenChar(exercise.dir);
      if (dirChar !== undefined) throw new Error(`Char \`${dirChar}\` in the exercise dir \`${exercise.dir}\` is not allowed`);
      const readme = `${exerciseDir("exercises", exercise)}/README.md`;
      if (source === "repo" && !warnedReadmes.has(readme) && !existsSync(readme)) {
        // Optional, but `tslings init` copies it next to the exercises: learners read it.
        warnedReadmes.add(readme);
        write(`${paint("yellow", "Warning:")} the directory \`${exerciseDir("exercises", exercise)}\` has no \`README.md\`\n`);
      }
    }

    if (exercise.hint.trim() === "") {
      throw new Error(
        `The exercise \`${name}\` has an empty hint. Please provide a hint or at least tell the user why a hint isn't needed for this exercise`,
      );
    }

    if (names.has(name)) throw new Error(`The exercise name \`${name}\` is duplicated. Exercise names must all be unique`);
    names.add(name);

    checkLintSettings(exercise);

    const path = exercisePath(exercise);
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch (error) {
      throw new Error(`Failed to read the file ${path}`, { cause: error });
    }

    if (!content.includes("// TODO")) {
      throw new Error(
        `Didn't find any \`// TODO\` comment in the file \`${path}\`.\nYou need to have at least one such comment to guide the user.`,
      );
    }

    const containsTests = /from\s+["']node:test["']/.test(content);
    if (exercise.test && !containsTests) {
      throw new Error(
        `The file \`${path}\` doesn't contain any tests (it doesn't import \`node:test\`). If you don't want to add tests to this exercise, set \`test = false\` for this exercise in the \`info.toml\` file`,
      );
    }
    if (!exercise.test && containsTests) {
      throw new Error(`The file \`${path}\` imports \`node:test\` but the exercise \`${name}\` has \`test = false\` in the \`info.toml\` file`);
    }

    paths.add(path);
    for (const extra of exercise.extraFiles) {
      if (extra.includes("/") || extra.includes("\\") || extra === "README.md") {
        throw new Error(`The extra file \`${extra}\` of the exercise \`${name}\` must be a file name in the exercise's directory`);
      }
    }
    for (const extra of extraFilePaths("exercises", exercise)) {
      if (!existsSync(extra)) throw new Error(`The extra file \`${extra}\` of the exercise \`${name}\` doesn't exist`);
      paths.add(extra);
    }
  }

  return paths;
}

function checkLintSettings(exercise: ExerciseInfo): void {
  for (const rule of exercise.allowLints) {
    if (!LINT_RULES.includes(rule)) {
      throw new Error(`Unknown lint rule \`${rule}\` in \`allow_lints\` of the exercise \`${exercise.name}\`. Known rules: ${LINT_RULES.join(", ")}`);
    }
  }
  checkErrorNotes(exercise);
}

/** `error_notes` keys are an error code or lint rule, optionally followed by a message filter. */
export function checkErrorNotes(exercise: Pick<ExerciseInfo, "name" | "errorNotes">): void {
  const seen = new Map<string, string>();
  for (const key of Object.keys(exercise.errorNotes)) {
    const where = `in \`error_notes\` of the exercise \`${exercise.name}\``;
    const parsed = parseNoteKey(key);
    if (parsed === undefined) {
      throw new Error(
        `The key \`${key}\` ${where} is malformed. Write an error code or lint rule, optionally followed by a space and the text the message must contain: \`TS2339\`, \`"TS2339 radius"\` or \`"TS2339 'radius'"\``,
      );
    }
    if (!/^TS\d+$/.test(parsed.code) && !LINT_RULES.includes(parsed.code)) {
      throw new Error(
        `The key \`${key}\` ${where} doesn't start with a TypeScript error code (like \`TS2322\`) or a lint rule`,
      );
    }
    const normalized = `${parsed.code}\0${parsed.filter ?? ""}`;
    const duplicate = seen.get(normalized);
    if (duplicate !== undefined) {
      throw new Error(`The keys \`${duplicate}\` and \`${key}\` ${where} are for the same messages`);
    }
    seen.set(normalized, key);
    if (exercise.errorNotes[key]?.trim() === "") {
      throw new Error(`The note \`${key}\` ${where} is empty`);
    }
  }
}

/**
 * Only allowed files and `README.md` files may be in `dir`, with at most one
 * level of directories.
 */
function checkUnexpectedFiles(dir: "exercises" | "solutions", allowed: ReadonlySet<string>): void {
  const unexpected = (path: string): Error =>
    new Error(
      `Found the file \`${path}\`. Only \`README.md\`, exercise files and extra files of exercises in \`info.toml\` are allowed in the \`${dir}\` directory`,
    );

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isFile()) {
      if (entry.name !== "README.md" && !allowed.has(path)) throw unexpected(path);
      continue;
    }

    for (const nested of readdirSync(path, { withFileTypes: true })) {
      const nestedPath = `${path}/${nested.name}`;
      if (!nested.isFile()) {
        throw new Error(`Found \`${nestedPath}\` but expected only files. Only one level of exercise nesting is allowed`);
      }
      if (nested.name !== "README.md" && !allowed.has(nestedPath)) throw unexpected(nestedPath);
    }
  }
}

async function checkExercisesUnsolved(info: InfoFile, runner: ExerciseRunner): Promise<void> {
  write("Running all exercises to check that they aren't already solved...\n");
  const exercises = info.exercises.filter((exercise) => !exercise.skipCheckUnsolved);
  const progress = new ProgressCounter(exercises.length);

  const results = await runPool(exercises.length, checkParallelism(), async (index) => {
    const exercise = exercises[index];
    if (exercise === undefined) throw new Error("Invalid exercise index");
    const { success } = await runner.runExercise(exercise, { color: false });
    progress.increment();
    return success;
  });
  progress.finish();

  results.forEach((result, index) => {
    if (result.status === "rejected") throw result.reason;
    if (result.value) {
      throw new Error(`The exercise ${exercises[index]?.name ?? ""} is already solved.\n${SKIP_CHECK_UNSOLVED_HINT}`);
    }
  });
}

type SolutionCheck =
  | { readonly kind: "success" }
  | { readonly kind: "missing" }
  | { readonly kind: "failure"; readonly output: string };

async function checkSolutions(requireSolutions: boolean, info: InfoFile, runner: ExerciseRunner): Promise<void> {
  write("Running all solutions...\n");
  const progress = new ProgressCounter(info.exercises.length);

  const results = await runPool(info.exercises.length, checkParallelism(), async (index): Promise<SolutionCheck> => {
    const exercise = info.exercises[index];
    if (exercise === undefined) throw new Error("Invalid exercise index");
    try {
      if (!existsSync(solutionPath(exercise))) {
        if (requireSolutions) throw new Error(`The solution of the exercise ${exercise.name} is missing`);
        return { kind: "missing" };
      }
      const { success, output } = await runner.runSolution(exercise, { color: stdoutColor });
      return success ? { kind: "success" } : { kind: "failure", output };
    } finally {
      progress.increment();
    }
  });
  progress.finish();

  const solutionFiles = new Set<string>();
  for (const [index, result] of results.entries()) {
    const exercise = info.exercises[index];
    if (exercise === undefined) continue;
    if (result.status === "rejected") throw result.reason;
    const check = result.value;
    if (check.kind === "failure") {
      write(check.output);
      throw new Error(`Running the solution of the exercise ${exercise.name} failed with the error above`);
    }
    if (check.kind === "missing") continue;

    solutionFiles.add(solutionPath(exercise));
    for (const extra of extraFilePaths("solutions", exercise)) {
      if (!existsSync(extra)) {
        throw new Error(`The solution of the exercise \`${exercise.name}\` needs the extra file \`${extra}\`, which doesn't exist`);
      }
      solutionFiles.add(extra);
    }
  }

  checkExtraFiles(info, runner);
  checkUnexpectedFiles("solutions", solutionFiles);
}

/**
 * Extra files are provided, not edited: tslings restores the official ones
 * before each check. Both copies must be the same, and TypeScript files must
 * type-check and lint cleanly on their own.
 */
function checkExtraFiles(info: InfoFile, runner: ExerciseRunner): void {
  const checked = new Set<string>();
  for (const exercise of info.exercises) {
    const solutionExtras = extraFilePaths("solutions", exercise);
    extraFilePaths("exercises", exercise).forEach((extra, index) => {
      const solutionExtra = solutionExtras[index];
      if (solutionExtra === undefined || !existsSync(extra) || !existsSync(solutionExtra)) return;
      if (!readFileSync(extra).equals(readFileSync(solutionExtra))) {
        throw new Error(
          `The extra file \`${extra}\` of the exercise \`${exercise.name}\` differs from \`${solutionExtra}\`. Extra files are provided to the learner, not edited, so both copies must be identical`,
        );
      }
    });

    for (const extra of [...extraFilePaths("exercises", exercise), ...solutionExtras]) {
      if (!extra.endsWith(".ts") || checked.has(extra) || !existsSync(extra)) continue;
      checked.add(extra);
      const { success, output } = runner.checkOnly(extra, { strictLint: true, color: stdoutColor });
      if (!success) {
        write(output);
        throw new Error(`The extra file ${extra} of the exercise ${exercise.name} has the errors above`);
      }
    }
  }
}

export async function check(requireSolutions: boolean): Promise<void> {
  const { info, local } = loadInfoFile({ strict: true });
  if (!local) {
    throw new Error(
      `There's no \`${INFO_FILE_NAME}\` file in the current directory.\n` +
        "`tslings dev check` checks community exercises, or the official ones in the tslings repository.",
    );
  }
  const source = detectSource(local);

  if (info.exercises.length > MAX_N_EXERCISES) {
    throw new Error(`The maximum number of exercises is ${MAX_N_EXERCISES}`);
  }

  if (source === "repo") {
    if (hasCurriculum(".") && readFileSync(INFO_FILE_NAME, "utf8") !== assembleInfoToml(".").text) {
      throw new Error(
        "The file `info.toml` is outdated. Run `tslings dev update` (or `node scripts/assemble-info.ts`) to update it. Then run `tslings dev check` again",
      );
    }
  } else {
    const outdated = outdatedSetupFiles();
    if (outdated.length > 0) {
      throw new Error(
        `${outdated.map((file) => `\`${file}\``).join(" and ")} ${outdated.length === 1 ? "is" : "are"} outdated. Run \`tslings dev update\` to update ${outdated.length === 1 ? "it" : "them"}. Then run \`tslings dev check\` again`,
      );
    }
  }

  if (info.formatVersion < CURRENT_FORMAT_VERSION) {
    throw new Error(`\`format_version\` < ${CURRENT_FORMAT_VERSION} (supported version)\nPlease migrate to the latest format version`);
  }
  if (info.formatVersion > CURRENT_FORMAT_VERSION) {
    throw new Error(`\`format_version\` > ${CURRENT_FORMAT_VERSION} (supported version)\nTry updating the tslings program`);
  }

  const exerciseFiles = checkInfoFileExercises(info, source);
  checkUnexpectedFiles("exercises", exerciseFiles);
  if (!existsSync("solutions") || !statSync("solutions").isDirectory()) {
    throw new Error("The `solutions/` directory is missing");
  }

  const runner = new ExerciseRunner(writeCheckerConfig(source));
  try {
    await checkExercisesUnsolved(info, runner);
    await checkSolutions(requireSolutions, info, runner);
  } finally {
    runner.close();
  }

  write("Everything looks fine!\n");
}
