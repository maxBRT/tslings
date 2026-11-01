// `tslings init`: create the `tslings/` directory with the official exercises.

import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { NPM, runQuietly } from "./cmd.ts";
import { loadInfoFile } from "./info-file.ts";
import { initExercisesDir } from "./package-files.ts";
import { packageFile, REPOSITORY_URL, TYPES_NODE_VERSION, TYPESCRIPT_VERSION } from "./package.ts";
import { paint, pressEnterPrompt, write } from "./term.ts";

const TSLINGS_DIR = "tslings";

/** `package.json` of a directory with exercises: ES modules, `#type-assert`, and the tools for the editor. */
export function exercisesPackageJson(name: string): string {
  const packageJson = {
    name,
    private: true,
    type: "module",
    imports: { "#type-assert": "./type-assert.ts" },
    devDependencies: { "@types/node": TYPES_NODE_VERSION, typescript: TYPESCRIPT_VERSION },
  };
  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

/** Write the files that make the editor (and Node) understand the exercises. */
export function writeTypeScriptSetup(packageName: string): void {
  copyFileSync(packageFile("templates", "tsconfig.json"), "tsconfig.json");
  copyFileSync(packageFile("templates", "type-assert.ts"), "type-assert.ts");
  writeFileSync("package.json", exercisesPackageJson(packageName));
}

const GITIGNORE = `node_modules/
package-lock.json
.tslings/
`;

const README = `# tslings

This is your space to solve tslings exercises.
Simply run \`tslings\` in this directory to get started!
Learn more about using tslings here:
<${REPOSITORY_URL}#readme>
`;

const SOLUTIONS_README = `# Official tslings solutions

Before you finish an exercise, its solution file doesn't exist yet.
The solution will appear in this directory once you finish the exercise.

Note that these solutions are often only _one possibility_ to solve an exercise.
`;

const TSLINGS_DIR_ALREADY_EXISTS_ERR = `A directory with the name \`tslings\` already exists in the current directory.
You probably already initialized tslings.
Run \`cd tslings\`
Then run \`tslings\` again`;

const IN_INITIALIZED_DIR_ERR = `It looks like tslings is already initialized in this directory.

If you already initialized tslings, run the command \`tslings\` for instructions on getting started with the exercises.
Otherwise, please run \`tslings init\` again in a different directory.`;

const POST_INIT_MSG = `Run \`cd tslings\` to go into the generated directory.
Then run \`tslings\` to get started.
`;

/** The closest `package.json` in this directory or a parent. */
function enclosingPackageJson(dir: string): string | undefined {
  for (let current = dir; ; current = dirname(current)) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) return candidate;
    if (dirname(current) === current) return undefined;
  }
}

/** Whether `dir` or a parent is already under version control. */
function insideRepository(dir: string): boolean {
  for (let current = dir; ; current = dirname(current)) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, ".jj"))) return true;
    if (dirname(current) === current) return false;
  }
}

/** Run `npm install` with npm's own output; resolve to whether it worked. */
function npmInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(NPM, ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      stdio: ["ignore", "inherit", "inherit"],
      shell: process.platform === "win32",
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function init(options: { readonly noInstall: boolean }): Promise<void> {
  if (existsSync(TSLINGS_DIR)) throw new Error(TSLINGS_DIR_ALREADY_EXISTS_ERR);
  if (existsSync("exercises") && existsSync("solutions")) throw new Error(IN_INITIALIZED_DIR_ERR);

  const enclosing = enclosingPackageJson(process.cwd());
  if (enclosing === undefined) {
    write("This command will create the directory `tslings/` which will contain the exercises.\nPress ENTER to continue ");
  } else {
    write(
      `The current directory is part of the npm project of ${enclosing}\n` +
        "This command will create the directory `tslings/` as a separate npm project inside it.\nPress ENTER to continue ",
    );
  }
  await pressEnterPrompt();

  // Read the official exercises before leaving the current directory, which may have a local `info.toml`.
  const { info } = loadInfoFile({ fromPackage: true });

  try {
    mkdirSync(TSLINGS_DIR);
  } catch (error) {
    throw new Error("Failed to create the `tslings/` directory", { cause: error });
  }
  process.chdir(TSLINGS_DIR);

  initExercisesDir(info.exercises);

  mkdirSync("solutions");
  writeFileSync("solutions/README.md", SOLUTIONS_README);

  writeTypeScriptSetup("tslings-exercises");
  writeFileSync(".gitignore", GITIGNORE);
  writeFileSync("README.md", README);

  if (!insideRepository(process.cwd())) {
    // Git is optional: ignore any error.
    runQuietly("git", ["init"]);
  }

  if (!options.noInstall) {
    write("Installing TypeScript and Node.js types for your editor (`npm install`)…\n");
    if (!(await npmInstall())) {
      write(
        `${paint("yellow", "`npm install` failed.")} tslings works without it, but your editor won't know about\n` +
          "Node.js types until you run `npm install` in the `tslings/` directory.\n",
      );
    }
  }

  write(`${paint("green", "Initialization done ✓")}\n\n${paint("bold", POST_INIT_MSG)}`);
}
