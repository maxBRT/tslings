// The `info.toml` file: the list of exercises and their metadata.
//
// The official exercises ship an `info.toml` in the tslings package. A local
// `info.toml` in the current directory overrides it: that's how community
// exercises work.

import { existsSync, readFileSync } from "node:fs";
import { parse, TomlError } from "smol-toml";
import { CHEAT_RULES, STYLE_RULES } from "./checker.ts";
import { isRecord, type JsonObject } from "./json.ts";
import { packageFile } from "./package.ts";

/** Raise it when the format changes in a way older tslings versions can't read. */
export const CURRENT_FORMAT_VERSION = 1;
export const INFO_FILE_NAME = "info.toml";

/** The metadata of one exercise. Field names are camelCase versions of the TOML keys. */
export interface ExerciseInfo {
  /** Unique name; the file is `exercises/<dir>/<name>.ts`. */
  readonly name: string;
  /** Directory inside `exercises/`, if any. */
  readonly dir: string | undefined;
  /** Run the file's `node:test` tests (`true`), or just run the file and show its output (`false`). */
  readonly test: boolean;
  /** Style lints are errors instead of warnings. */
  readonly strictLint: boolean;
  /** Lint rules this exercise may break, when breaking them is the lesson. */
  readonly allowLints: readonly string[];
  /** Shown on request. */
  readonly hint: string;
  /** The exercise is already solved (like `intro1`): `dev check` doesn't require it to fail. */
  readonly skipCheckUnsolved: boolean;
  /** Explanations shown under specific errors, keyed by `TS2322` or lint rule name. */
  readonly errorNotes: Readonly<Record<string, string>>;
  /** Sibling modules the exercise imports, copied along with it. */
  readonly extraFiles: readonly string[];
}

export interface InfoFile {
  readonly formatVersion: number;
  /** Shown once, when starting with the exercises. */
  readonly welcomeMessage: string;
  /** Shown after finishing all exercises. */
  readonly finalMessage: string;
  readonly exercises: readonly ExerciseInfo[];
}

/** The keys an `[[exercises]]` entry may have. */
export const EXERCISE_KEYS = [
  "name",
  "dir",
  "test",
  "strict_lint",
  "allow_lints",
  "hint",
  "skip_check_unsolved",
  "error_notes",
  "extra_files",
] as const;

const TOP_LEVEL_KEYS = ["format_version", "welcome_message", "final_message", "exercises"] as const;

export const LINT_RULES: readonly string[] = [...CHEAT_RULES, ...STYLE_RULES];

export interface ParseOptions {
  /** Reject unknown keys (typos like `strict_lints`). Used by `tslings dev check`. */
  readonly strict?: boolean;
}

/** Parse and validate the content of an `info.toml` file. Throws on invalid content. */
export function parseInfoFile(text: string, options: ParseOptions = {}): InfoFile {
  let table: JsonObject;
  try {
    table = parse(text);
  } catch (error) {
    if (error instanceof TomlError) {
      throw new Error(`Invalid TOML at line ${error.line}, column ${error.column}: ${firstLine(error.message)}`, { cause: error });
    }
    throw error;
  }

  if (options.strict === true) rejectUnknownKeys(table, TOP_LEVEL_KEYS, "the top level");

  const formatVersion = table.format_version;
  if (typeof formatVersion !== "number" || !Number.isInteger(formatVersion) || formatVersion < 0) {
    throw new Error("`format_version` is missing or isn't a positive integer");
  }

  const exercises: unknown = table.exercises ?? [];
  if (!Array.isArray(exercises)) {
    throw new Error("`exercises` must be a list of `[[exercises]]` tables");
  }
  const entries: readonly unknown[] = exercises;

  return {
    formatVersion,
    welcomeMessage: optionalString(table, "welcome_message", "the top level") ?? "",
    finalMessage: optionalString(table, "final_message", "the top level") ?? "",
    exercises: entries.map((entry, index) => parseExercise(entry, index, options)),
  };
}

function parseExercise(entry: unknown, index: number, options: ParseOptions): ExerciseInfo {
  if (!isRecord(entry)) {
    throw new Error(`Exercise #${index + 1} must be a table`);
  }
  const name = entry.name;
  if (typeof name !== "string") {
    throw new Error(`Exercise #${index + 1} has no \`name\``);
  }
  const where = `the exercise \`${name}\``;
  if (options.strict === true) rejectUnknownKeys(entry, EXERCISE_KEYS, where);

  const hint = optionalString(entry, "hint", where);
  if (hint === undefined) {
    throw new Error(`${capitalize(where)} has no \`hint\``);
  }

  return {
    name,
    dir: optionalString(entry, "dir", where),
    test: optionalBoolean(entry, "test", where) ?? true,
    strictLint: optionalBoolean(entry, "strict_lint", where) ?? false,
    allowLints: optionalStringList(entry, "allow_lints", where) ?? [],
    hint,
    skipCheckUnsolved: optionalBoolean(entry, "skip_check_unsolved", where) ?? false,
    errorNotes: optionalStringTable(entry, "error_notes", where) ?? {},
    extraFiles: optionalStringList(entry, "extra_files", where) ?? [],
  };
}

function optionalString(table: JsonObject, key: string, where: string): string | undefined {
  const value = table[key];
  if (value === undefined || typeof value === "string") return value;
  throw new Error(`\`${key}\` in ${where} must be a string`);
}

function optionalBoolean(table: JsonObject, key: string, where: string): boolean | undefined {
  const value = table[key];
  if (value === undefined || typeof value === "boolean") return value;
  throw new Error(`\`${key}\` in ${where} must be \`true\` or \`false\``);
}

function optionalStringList(table: JsonObject, key: string, where: string): string[] | undefined {
  const value = table[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    const strings = items.filter((item) => typeof item === "string");
    if (strings.length === items.length) return strings;
  }
  throw new Error(`\`${key}\` in ${where} must be a list of strings`);
}

function optionalStringTable(table: JsonObject, key: string, where: string): Record<string, string> | undefined {
  const value = table[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`\`${key}\` in ${where} must be a table`);
  const result: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      throw new Error(`\`${key}.${entryKey}\` in ${where} must be a string`);
    }
    result[entryKey] = entryValue;
  }
  return result;
}

function rejectUnknownKeys(table: JsonObject, known: readonly string[], where: string): void {
  const unknown = Object.keys(table).find((key) => !known.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown key \`${unknown}\` in ${where}. Allowed keys: ${known.map((key) => `\`${key}\``).join(", ")}`);
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? text;
}

export interface LoadedInfoFile {
  readonly info: InfoFile;
  /** `true` when the `info.toml` of the current directory was used (community exercises). */
  readonly local: boolean;
}

/**
 * Official exercises: parse the `info.toml` shipped with tslings.
 * Community exercises: parse the `info.toml` file in the current directory.
 */
export function loadInfoFile(options: ParseOptions & { readonly fromPackage?: boolean } = {}): LoadedInfoFile {
  const local = options.fromPackage !== true && existsSync(INFO_FILE_NAME);
  const path = local ? INFO_FILE_NAME : packageFile(INFO_FILE_NAME);

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(
      local ? "Failed to read the `info.toml` file" : `Failed to read the official \`info.toml\` file shipped with tslings (${path})`,
      { cause: error },
    );
  }

  let info: InfoFile;
  try {
    info = parseInfoFile(text, options);
  } catch (error) {
    throw new Error(local ? "Failed to parse the `info.toml` file" : "Failed to parse the official `info.toml` file", { cause: error });
  }

  if (info.exercises.length === 0) {
    throw new Error("There are no exercises yet!\nAdd at least one exercise before testing.");
  }
  return { info, local };
}

/** `exercises/<dir>/<name>.ts`, with forward slashes on every platform. */
export function exercisePath(exercise: Pick<ExerciseInfo, "name" | "dir">): string {
  return exercise.dir === undefined ? `exercises/${exercise.name}.ts` : `exercises/${exercise.dir}/${exercise.name}.ts`;
}

/** `solutions/<dir>/<name>.ts` */
export function solutionPath(exercise: Pick<ExerciseInfo, "name" | "dir">): string {
  return exercise.dir === undefined ? `solutions/${exercise.name}.ts` : `solutions/${exercise.dir}/${exercise.name}.ts`;
}

/** The directory of an exercise inside `exercises/` or `solutions/`: `exercises/<dir>`. */
export function exerciseDir(base: "exercises" | "solutions", exercise: Pick<ExerciseInfo, "dir">): string {
  return exercise.dir === undefined ? base : `${base}/${exercise.dir}`;
}
