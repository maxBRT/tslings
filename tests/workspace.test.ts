import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createExercise } from "../src/exercise.ts";
import type { ExerciseInfo } from "../src/info-file.ts";
import { readJsonObject } from "../src/json.ts";
import { nodeVersionError } from "../src/node-version.ts";
import { packageFile, TYPE_ROOTS_DIR } from "../src/package.ts";
import { exerciseFileMap } from "../src/watch/file-watcher.ts";
import { detectSource, writeCheckerConfig } from "../src/workspace.ts";
import { temporaryDir } from "./helpers.ts";

test("the checker config of official exercises extends the shipped template", () => {
  const dir = temporaryDir();
  // A tsconfig the learner may have weakened doesn't count.
  writeFileSync(join(dir, "tsconfig.json"), '{ "compilerOptions": { "strict": false } }');
  const path = writeCheckerConfig("official", dir);
  assert.equal(path, join(dir, ".tslings", "tsconfig.json"));
  assert.deepEqual(readJsonObject(path), {
    extends: packageFile("templates", "tsconfig.json"),
    compilerOptions: { typeRoots: [TYPE_ROOTS_DIR] },
    include: ["../exercises/**/*.ts", "../solutions/**/*.ts", "../type-assert.ts"],
  });
});

test("community exercises use their own tsconfig, the repository uses the template", () => {
  const dir = temporaryDir();
  writeFileSync(join(dir, "tsconfig.json"), "{}");
  assert.equal(readJsonObject(writeCheckerConfig("community", dir)).extends, "../tsconfig.json");
  const repo = readJsonObject(writeCheckerConfig("repo", dir));
  assert.equal(repo.extends, "../templates/tsconfig.json");
  assert.deepEqual(repo.include, ["../exercises/**/*.ts", "../solutions/**/*.ts", "../templates/type-assert.ts"]);
});

test("the repository is recognized by its marker file", () => {
  const dir = temporaryDir();
  assert.equal(detectSource(false, dir), "official");
  assert.equal(detectSource(true, dir), "community");
  mkdirSync(join(dir, "dev"));
  writeFileSync(join(dir, "dev", "tslings-repo.txt"), "");
  assert.equal(detectSource(true, dir), "repo");
});

test("the file watcher knows which exercises a file belongs to", () => {
  const info = (name: string, extraFiles: string[] = []): ExerciseInfo => ({
    name,
    dir: "14_modules",
    test: true,
    strictLint: false,
    allowLints: [],
    hint: "",
    skipCheckUnsolved: false,
    errorNotes: {},
    extraFiles,
  });
  const exercises = [info("modules1"), info("modules2", ["money.ts"]), info("modules3", ["money.ts"])].map((exercise) =>
    createExercise(exercise, undefined),
  );
  const map = exerciseFileMap(exercises);
  assert.deepEqual(map.get("14_modules/modules1.ts"), [0]);
  assert.deepEqual(map.get("14_modules/money.ts"), [1, 2]);
});

test("Node.js version check", () => {
  assert.equal(nodeVersionError("24.0.0"), undefined);
  assert.equal(nodeVersionError("25.1.0"), undefined);
  assert.match(nodeVersionError("22.18.0") ?? "", /needs Node\.js 24 or newer[\s\S]*You are using Node\.js v22\.18\.0/);
  assert.match(nodeVersionError("23.11.1") ?? "", /needs Node\.js 24 or newer/);
  assert.match(nodeVersionError("20.11.0") ?? "", /You are using Node\.js v20\.11\.0/);
});
