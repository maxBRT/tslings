// The CLI run as a subprocess, like rustlings' `tests/integration_tests.rs`.

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli, communityExercises, fakePackage, sh, temporaryDir } from "./helpers.ts";

describe("community exercises", () => {
  test("run: compilation success", () => {
    const result = cli(["run", "compilation_success"], { cwd: communityExercises() });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Output\nOutput from the exercise file\n/);
    assert.match(result.stdout, /✓ Successfully ran exercises\/compilation_success\.ts/);
    assert.match(result.stdout, /Next exercise: exercises\/compilation_failure\.ts/);
  });

  test("run: compilation failure", () => {
    const result = cli(["run", "compilation_failure"], { cwd: communityExercises() });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /error\[TS2322\]: Type 'string' is not assignable to type 'number'\./);
    assert.match(result.stdout, /--> exercises\/compilation_failure\.ts:1:7/);
    assert.match(result.stdout, /Ran exercises\/compilation_failure\.ts with errors/);
  });

  test("run: test success shows the file's output", () => {
    const result = cli(["run", "test_success"], { cwd: communityExercises() });
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /^Output from the exercise file\n/m);
  });

  test("run: test failure", () => {
    const result = cli(["run", "test_failure"], { cwd: communityExercises() });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /42 !== 41/);
  });

  test("run: exercise not in info.toml", () => {
    const result = cli(["run", "not_in_info"], { cwd: communityExercises() });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No exercise found for 'not_in_info'!/);
  });

  test("run without a name runs the current exercise", () => {
    const dir = communityExercises();
    cli(["run", "test_failure"], { cwd: dir });
    const result = cli(["run"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Ran exercises\/test_failure\.ts with errors/);
  });

  test("reset without exercise name", () => {
    const result = cli(["reset"], { cwd: communityExercises() });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /the following required arguments were not provided:\n {2}<NAME>/);
  });

  test("hint", () => {
    const result = cli(["hint", "test_failure"], { cwd: communityExercises() });
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes("\n\nHint:\nThe answer to everything: 42\n"), result.stdout);
  });

  test("check-all marks exercises and reports the first pending one", () => {
    const dir = communityExercises();
    const result = cli(["check-all"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Checking all exercises…/);
    assert.match(result.stdout, /1✓ {3}2✗ {3}3✓ {3}4✗/);
    assert.match(result.stdout, /2\/4 exercises pending\. The first: exercises\/compilation_failure\.ts/);
    assert.equal(
      readFileSync(join(dir, ".tslings-state.txt"), "utf8"),
      "DON'T EDIT THIS FILE!\n\ncompilation_failure\n\ncompilation_success\ntest_success",
    );
  });

  test("check-all prints the final message when everything passes", () => {
    const dir = communityExercises();
    writeFileSync(join(dir, "exercises", "compilation_failure.ts"), "export {};\n");
    writeFileSync(join(dir, "exercises", "test_failure.ts"), 'import { test } from "node:test";\ntest("ok", () => {});\n');
    const result = cli(["check-all"], { cwd: dir });
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /You made it to the finish line!/);
  });

  test("reset uses git stash for community exercises", () => {
    const dir = communityExercises();
    sh("git", ["init", "-q"], dir);
    sh("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "."], dir);
    sh("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init"], dir);
    const file = join(dir, "exercises", "test_failure.ts");
    const original = readFileSync(file, "utf8");
    writeFileSync(file, "// changed\n");

    const result = cli(["reset", "test_failure"], { cwd: dir, env: { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "The exercise exercises/test_failure.ts has been reset\n");
    assert.equal(readFileSync(file, "utf8"), original);
  });

  test("the watch mode needs a terminal", () => {
    const result = cli([], { cwd: communityExercises() });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unsupported or missing terminal\/TTY/);
  });

  test("a newer format version is refused", () => {
    const dir = communityExercises();
    const info = join(dir, "info.toml");
    writeFileSync(info, readFileSync(info, "utf8").replace("format_version = 1", "format_version = 2"));
    const result = cli(["hint", "test_failure"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /format version specified in the `info.toml` file is higher/);
  });

  test("an invalid info.toml is explained", () => {
    const dir = communityExercises();
    writeFileSync(join(dir, "info.toml"), "format_version = 1\n[[exercises]]\nname = 3\n");
    const result = cli(["hint"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Failed to parse the `info.toml` file\n\nCaused by:\n {4}Exercise #1 has no `name`/);
  });
});

test("without exercises/, tslings asks to run init", () => {
  const result = cli([], { cwd: temporaryDir() });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Welcome to\.\.\./);
  assert.match(result.stdout, /run the command `tslings init` to initialize it/);
});

test("--version and --help", () => {
  const version = cli(["--version"], { cwd: temporaryDir() });
  assert.match(version.stdout, /^tslings \d+\.\d+\.\d+\n$/);
  const help = cli(["--help"], { cwd: temporaryDir() });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: tslings \[OPTIONS\] \[COMMAND\]/);
  assert.match(help.stdout, /check-all {2}Check all the exercises/);
});

describe("official exercises", () => {
  test("init", () => {
    const main = fakePackage();
    const dir = temporaryDir();

    // Before initialization, there's nothing to run.
    assert.equal(cli([], { cwd: dir, main }).status, 1);

    const init = cli(["init", "--no-install"], { cwd: dir, main });
    assert.equal(init.status, 0, init.stderr);
    assert.match(init.stdout, /Initialization done ✓/);

    const tslings = join(dir, "tslings");
    for (const file of [
      "exercises/README.md",
      "exercises/00_intro/README.md",
      "exercises/00_intro/intro1.ts",
      "exercises/01_basics/shapes.ts",
      "solutions/README.md",
      "tsconfig.json",
      "type-assert.ts",
      "package.json",
      ".gitignore",
      "README.md",
    ]) {
      assert.ok(existsSync(join(tslings, file)), `${file} should exist`);
    }
    assert.ok(!existsSync(join(tslings, "solutions", "00_intro", "intro1.ts")), "solutions appear once done");
    const packageJson: unknown = JSON.parse(readFileSync(join(tslings, "package.json"), "utf8"));
    assert.deepEqual(packageJson, {
      name: "tslings-exercises",
      private: true,
      type: "module",
      imports: { "#type-assert": "./type-assert.ts" },
      devDependencies: {
        "@types/node": JSON.parse(readFileSync(join(import.meta.dirname, "..", "node_modules", "@types", "node", "package.json"), "utf8")).version,
        typescript: "7.0.2",
      },
    });

    // Running `init` after a successful initialization.
    const again = cli(["init", "--no-install"], { cwd: dir, main });
    assert.equal(again.status, 1);
    assert.match(again.stderr, /`cd tslings`/);

    // Running `init` in the initialized directory.
    const inside = cli(["init", "--no-install"], { cwd: tslings, main });
    assert.equal(inside.status, 1);
    assert.match(inside.stderr, /already initialized/);
  });

  test("solving an exercise copies its solution, reset restores it", () => {
    const main = fakePackage();
    const dir = temporaryDir();
    cli(["init", "--no-install"], { cwd: dir, main });
    const tslings = join(dir, "tslings");

    const first = cli(["run", "basics1"], { cwd: tslings, main });
    assert.equal(first.status, 1);
    // The welcome message is shown once, before the first command.
    assert.match(first.stdout, /Welcome to the tslings test exercises!\n\nPress ENTER to continue/);
    assert.match(first.stdout, /= help: `area` must return a number\./);

    const file = join(tslings, "exercises", "01_basics", "basics1.ts");
    const original = readFileSync(file, "utf8");
    writeFileSync(file, original.replace("return `${square.side * square.side}`;", "return square.side * square.side;"));

    const solved = cli(["run", "basics1"], { cwd: tslings, main });
    assert.equal(solved.status, 0, solved.stdout);
    assert.doesNotMatch(solved.stdout, /Press ENTER/);
    assert.match(solved.stdout, /Solution for comparison: solutions\/01_basics\/basics1\.ts/);
    assert.ok(existsSync(join(tslings, "solutions", "01_basics", "basics1.ts")));
    assert.ok(existsSync(join(tslings, "solutions", "01_basics", "shapes.ts")), "extra files come with the solution");

    const reset = cli(["reset", "basics1"], { cwd: tslings, main });
    assert.equal(reset.status, 0, reset.stderr);
    assert.equal(readFileSync(file, "utf8"), original);
  });

  test("extra files are restored before each check, so editing them can't solve an exercise", () => {
    const main = fakePackage();
    const dir = temporaryDir();
    cli(["init", "--no-install"], { cwd: dir, main });
    const tslings = join(dir, "tslings");
    const shapes = join(tslings, "exercises", "01_basics", "shapes.ts");
    const original = readFileSync(shapes, "utf8");

    writeFileSync(shapes, original.replace("readonly side: number;", "readonly side: string;"));
    const run = cli(["run", "basics1"], { cwd: tslings, main });
    assert.equal(run.status, 1, run.stdout);
    assert.match(run.stdout, /note: exercises\/01_basics\/shapes\.ts is provided by tslings and was restored\. Make your changes in exercises\/01_basics\/basics1\.ts\./);
    assert.equal(readFileSync(shapes, "utf8"), original);

    // Nothing to restore, nothing to say.
    assert.doesNotMatch(cli(["run", "basics1"], { cwd: tslings, main }).stdout, /was restored/);
  });

  test("check-all restores deleted files and finds the first pending exercise", () => {
    const main = fakePackage();
    const dir = temporaryDir();
    cli(["init", "--no-install"], { cwd: dir, main });
    const tslings = join(dir, "tslings");
    writeFileSync(join(tslings, ".tslings-state.txt"), "DON'T EDIT THIS FILE!\n\nintro1\n");

    const result = cli(["check-all"], { cwd: tslings, main });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /2\/3 exercises pending\. The first: exercises\/00_intro\/intro2\.ts/);
  });
});

describe("dev", () => {
  test("dev new creates a project that dev check explains", () => {
    const dir = temporaryDir();
    const created = cli(["dev", "new", "my-exercises", "--no-git"], { cwd: dir });
    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Created the file {6}my-exercises\/info\.toml/);

    const project = join(dir, "my-exercises");
    const check = cli(["dev", "check"], { cwd: project });
    assert.equal(check.status, 1);
    assert.match(check.stderr, /Char `\?` in the exercise name `\?\?\?` is not allowed/);
  });

  test("dev check passes on valid community exercises", () => {
    const dir = temporaryDir();
    cli(["dev", "new", "project", "--no-git"], { cwd: dir });
    const project = join(dir, "project");
    writeFileSync(
      join(project, "info.toml"),
      'format_version = 1\n\n[[exercises]]\nname = "first"\nhint = "Return 2."\n\n[[exercises]]\nname = "printing"\ntest = false\nhint = "Print it."\n',
    );
    const exercise = (value: string): string =>
      `import { test } from "node:test";\nimport assert from "node:assert/strict";\n\n// TODO: Return 2.\nfunction two(): number {\n  return ${value};\n}\n\ntest("two", () => {\n  assert.equal(two(), 2);\n});\n`;
    writeFileSync(join(project, "exercises", "first.ts"), exercise("1"));
    writeFileSync(join(project, "solutions", "first.ts"), exercise("2"));
    writeFileSync(join(project, "exercises", "printing.ts"), '// TODO: Print a number.\nconst value: number = "1";\nconsole.log(value);\n');

    const check = cli(["dev", "check"], { cwd: project });
    assert.equal(check.status, 0, check.stderr + check.stdout);
    assert.match(check.stdout, /Everything looks fine!/);

    const required = cli(["dev", "check", "--require-solutions"], { cwd: project });
    assert.equal(required.status, 1);
    assert.match(required.stderr, /The solution of the exercise printing is missing/);

    // A solution that only passes because of `as` is rejected.
    writeFileSync(join(project, "solutions", "first.ts"), exercise('"2" as unknown as number'));
    const cheating = cli(["dev", "check"], { cwd: project });
    assert.equal(cheating.status, 1);
    assert.match(cheating.stdout, /error\[no-type-assertion\]/);
    assert.match(cheating.stderr, /Running the solution of the exercise first failed with the error above/);
  });

  test("dev check finds solved exercises, unexpected files and bad metadata", () => {
    const dir = temporaryDir();
    cli(["dev", "new", "project", "--no-git"], { cwd: dir });
    const project = join(dir, "project");
    const info = (extra: string): void =>
      writeFileSync(join(project, "info.toml"), `format_version = 1\n\n[[exercises]]\nname = "solved"\ntest = false\nhint = "h"\n${extra}`);
    writeFileSync(join(project, "exercises", "solved.ts"), '// TODO: nothing\nconsole.log("done");\n');

    info("");
    assert.match(cli(["dev", "check"], { cwd: project }).stderr, /The exercise solved is already solved\./);

    info('allow_lints = ["no-anything"]\n');
    assert.match(cli(["dev", "check"], { cwd: project }).stderr, /Unknown lint rule `no-anything`/);

    info("[exercises.error_notes]\nTS999x = \"note\"\n");
    assert.match(cli(["dev", "check"], { cwd: project }).stderr, /neither a TypeScript error code/);

    info("strict_clippy = true\n");
    assert.match(cli(["dev", "check"], { cwd: project }).stderr, /Unknown key `strict_clippy`/);

    info("skip_check_unsolved = true\n");
    writeFileSync(join(project, "exercises", "stray.ts"), "export {};\n");
    assert.match(cli(["dev", "check"], { cwd: project }).stderr, /Found the file `exercises\/stray\.ts`/);
  });

  test("dev check wants both copies of an extra file to be the same", () => {
    const dir = temporaryDir();
    cli(["dev", "new", "project", "--no-git"], { cwd: dir });
    const project = join(dir, "project");
    writeFileSync(join(project, "info.toml"), 'format_version = 1\n\n[[exercises]]\nname = "area"\ntest = false\nextra_files = ["units.ts"]\nhint = "h"\n');
    const exercise = (value: string): string =>
      `import { unit } from "./units.ts";\n\n// TODO: Make it a number.\nconst area: number = ${value};\nconsole.log(area, unit);\n`;
    writeFileSync(join(project, "exercises", "area.ts"), exercise('"1"'));
    writeFileSync(join(project, "solutions", "area.ts"), exercise("1"));
    writeFileSync(join(project, "exercises", "units.ts"), 'export const unit = "m2";\n');
    writeFileSync(join(project, "solutions", "units.ts"), 'export const unit = "m2";\n');
    const same = cli(["dev", "check"], { cwd: project });
    assert.equal(same.status, 0, same.stderr + same.stdout);

    writeFileSync(join(project, "solutions", "units.ts"), 'export const unit = "sq m";\n');
    const different = cli(["dev", "check"], { cwd: project });
    assert.equal(different.status, 1);
    assert.match(different.stderr, /The extra file `exercises\/units\.ts` of the exercise `area` differs from `solutions\/units\.ts`/);
  });

  test("dev update keeps package.json and type-assert.ts in sync", () => {
    const dir = temporaryDir();
    cli(["dev", "new", "project", "--no-git"], { cwd: dir });
    const project = join(dir, "project");
    assert.equal(cli(["dev", "update"], { cwd: project }).stdout, "Everything is up to date\n");

    writeFileSync(join(project, "package.json"), '{ "name": "mine", "devDependencies": { "typescript": "6.0.0" } }\n');
    const updated = cli(["dev", "update"], { cwd: project });
    assert.equal(updated.stdout, "Updated `package.json`\n");
    const packageJson: unknown = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
    assert.ok(typeof packageJson === "object" && packageJson !== null && "devDependencies" in packageJson);
    assert.deepEqual(Object.keys(packageJson), ["name", "devDependencies", "type", "imports"]);
  });
});
