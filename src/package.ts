// Where tslings itself is installed, and what it ships with.
//
// rustlings embeds its exercises in its binary. tslings is an npm package
// instead: `info.toml`, `exercises/`, `solutions/` and `templates/` sit next to
// the code and are read at runtime from the package directory.

import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { isRecord, readJsonObject, stringField } from "./json.ts";

/** The package root: the parent of `src/` during development, of `dist/` once built. */
export const PACKAGE_ROOT = resolve(import.meta.dirname, "..");

const require = createRequire(import.meta.url);
const packageJson = readJsonObject(join(PACKAGE_ROOT, "package.json"));

export const VERSION = stringField(packageJson, "version") ?? "0.0.0";

/** `https://github.com/<owner>/tslings`, from the `repository` field of `package.json`. */
export const REPOSITORY_URL = repositoryUrl(packageJson.repository);

/** The exact TypeScript version tslings checks exercises with. */
export const TYPESCRIPT_VERSION = installedVersion("typescript");

/** The `@types/node` version tslings checks exercises with. */
export const TYPES_NODE_VERSION = installedVersion("@types/node");

/**
 * The `@types` directory that contains tslings' own `@types/node`.
 *
 * Learners don't need to run `npm install` for the checker to know Node's
 * types: the internal tsconfig points `typeRoots` here.
 */
export const TYPE_ROOTS_DIR = dirname(dirname(require.resolve("@types/node/package.json")));

/** A file shipped in the package: `templates/tsconfig.json`, `exercises/…`. */
export function packageFile(...segments: readonly string[]): string {
  return join(PACKAGE_ROOT, ...segments);
}

function installedVersion(name: string): string {
  const version = stringField(readJsonObject(require.resolve(`${name}/package.json`)), "version");
  if (version === undefined) {
    throw new Error(`The package ${name} installed with tslings has no version`);
  }
  return version;
}

function repositoryUrl(repository: unknown): string {
  const url = typeof repository === "string" ? repository : isRecord(repository) ? stringField(repository, "url") : undefined;
  return (url ?? "https://github.com/maxBRT/tslings").replace(/^git\+/, "").replace(/\.git$/, "");
}
