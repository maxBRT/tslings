// Where the exercises come from, and the tsconfig the checker uses for them.
//
// - official: `tslings init` copied the exercises shipped with tslings.
// - community: a local `info.toml` describes exercises made by someone else.
// - repo: the tslings repository itself (`dev/tslings-repo.txt` exists), where
//   `tslings dev check` checks the official exercises in place.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { packageFile, TYPE_ROOTS_DIR } from "./package.ts";

export type ExerciseSource = "official" | "community" | "repo";

/** Marks the tslings repository (like rustlings' `dev/rustlings-repo.txt`). */
export const REPO_MARKER = "dev/tslings-repo.txt";

/** The directory with tslings' generated files, ignored by Git. */
export const INTERNAL_DIR = ".tslings";

export function detectSource(localInfoFile: boolean, cwd: string = process.cwd()): ExerciseSource {
  if (!localInfoFile) return "official";
  return existsSync(join(cwd, REPO_MARKER)) ? "repo" : "community";
}

/**
 * Write `.tslings/tsconfig.json` and return its path.
 *
 * Learners may never run `npm install`, so the checker can't rely on a local
 * `node_modules/@types/node`. This config extends the exercises' tsconfig and
 * points `typeRoots` at the `@types` that ship with tslings. Official
 * exercises always extend the template shipped with tslings, so editing the
 * local `tsconfig.json` (to turn `strict` off, say) can't make exercises pass.
 */
export function writeCheckerConfig(source: ExerciseSource, cwd: string = process.cwd()): string {
  const dir = join(cwd, INTERNAL_DIR);
  const path = join(dir, "tsconfig.json");

  const typeAssert = source === "repo" ? "../templates/type-assert.ts" : "../type-assert.ts";
  const config = {
    extends: baseConfig(source, cwd),
    compilerOptions: { typeRoots: [TYPE_ROOTS_DIR] },
    include: ["../exercises/**/*.ts", "../solutions/**/*.ts", typeAssert],
  };
  const content = `${JSON.stringify(config, null, 2)}\n`;

  if (existsSync(path) && readFileSync(path, "utf8") === content) return path;

  mkdirSync(dir, { recursive: true });
  // Write then rename, so a checker that reads the file at the same time never sees half of it.
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
  return path;
}

function baseConfig(source: ExerciseSource, cwd: string): string {
  const template = resolve(packageFile("templates", "tsconfig.json"));
  switch (source) {
    case "official":
      return template;
    case "repo":
      return "../templates/tsconfig.json";
    case "community":
      return existsSync(join(cwd, "tsconfig.json")) ? "../tsconfig.json" : template;
  }
}
