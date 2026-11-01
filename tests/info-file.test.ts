import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { exercisePath, parseInfoFile, solutionPath } from "../src/info-file.ts";

describe("parseInfoFile", () => {
  test("defaults", () => {
    const info = parseInfoFile('format_version = 1\n[[exercises]]\nname = "intro1"\nhint = "h"\n');
    assert.equal(info.formatVersion, 1);
    assert.equal(info.welcomeMessage, "");
    assert.equal(info.finalMessage, "");
    assert.deepEqual(info.exercises, [
      {
        name: "intro1",
        dir: undefined,
        test: true,
        strictLint: false,
        allowLints: [],
        hint: "h",
        skipCheckUnsolved: false,
        errorNotes: {},
        extraFiles: [],
      },
    ]);
  });

  test("every field", () => {
    const info = parseInfoFile(`format_version = 1
welcome_message = "hi"
final_message = "bye"

[[exercises]]
name = "modules2"
dir = "14_modules"
test = false
strict_lint = true
allow_lints = ["no-ts-comment"]
skip_check_unsolved = true
extra_files = ["money.ts"]
hint = """
Look at the export."""

[exercises.error_notes]
TS2305 = "Export it first."
`);
    assert.equal(info.welcomeMessage, "hi");
    assert.equal(info.finalMessage, "bye");
    assert.deepEqual(info.exercises[0], {
      name: "modules2",
      dir: "14_modules",
      test: false,
      strictLint: true,
      allowLints: ["no-ts-comment"],
      hint: "Look at the export.",
      skipCheckUnsolved: true,
      errorNotes: { TS2305: "Export it first." },
      extraFiles: ["money.ts"],
    });
  });

  test("errors name the problem", () => {
    assert.throws(() => parseInfoFile("[[exercises]]\n"), /`format_version` is missing/);
    assert.throws(() => parseInfoFile('format_version = 1\n[[exercises]]\nname = "a"\n'), /The exercise `a` has no `hint`/);
    assert.throws(() => parseInfoFile('format_version = 1\n[[exercises]]\nname = "a"\nhint = ""\ntest = "yes"\n'), /`test` in the exercise `a` must be `true` or `false`/);
    assert.throws(() => parseInfoFile('format_version = 1\n[[exercises]]\nname = "a"\nhint = ""\nextra_files = [1]\n'), /must be a list of strings/);
    assert.throws(() => parseInfoFile("format_version = 1\nexercises = 3\n"), /must be a list/);
    assert.throws(() => parseInfoFile("format_version = \n"), /Invalid TOML at line 1/);
  });

  test("unknown keys are only rejected in strict mode", () => {
    const text = 'format_version = 1\n[[exercises]]\nname = "a"\nhint = ""\nstrict_clippy = true\n';
    assert.equal(parseInfoFile(text).exercises.length, 1);
    assert.throws(() => parseInfoFile(text, { strict: true }), /Unknown key `strict_clippy` in the exercise `a`/);
  });
});

test("paths", () => {
  assert.equal(exercisePath({ name: "unions2", dir: "07_unions_narrowing" }), "exercises/07_unions_narrowing/unions2.ts");
  assert.equal(exercisePath({ name: "flat", dir: undefined }), "exercises/flat.ts");
  assert.equal(solutionPath({ name: "quiz1", dir: "quizzes" }), "solutions/quizzes/quiz1.ts");
});
