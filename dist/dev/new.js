// `tslings dev new <PATH>`: start a project for community exercises.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { CURRENT_FORMAT_VERSION } from "../info-file.js";
import { writeTypeScriptSetup } from "../init.js";
import { STATE_FILE_NAME } from "../app-state.js";
import { REPOSITORY_URL } from "../package.js";
import { write } from "../term.js";
const GITIGNORE = `node_modules/
.tslings/
${STATE_FILE_NAME}
`;
const INFO_FILE = `# The format version is an indicator of the compatibility of community exercises with the
# tslings program.
# The format version is not the same as the version of the tslings program.
# In case tslings makes an unavoidable breaking change to the expected format of community
# exercises, you would need to raise this version and adapt to the new format.
# Otherwise, the newest version of the tslings program won't be able to run these exercises.
format_version = ${CURRENT_FORMAT_VERSION}

# Optional multi-line message to be shown to users when just starting with the exercises.
welcome_message = """Welcome to these community tslings exercises."""

# Optional multi-line message to be shown to users after finishing all exercises.
final_message = """We hope that you found the exercises helpful :D"""

# Repeat this section for every exercise.
[[exercises]]
# Exercise name which is the exercise file name without the \`.ts\` extension.
name = "???"

# Optional directory name to be provided if you want to organize exercises in directories.
# If \`dir\` is specified, the exercise path is \`exercises/DIR/NAME.ts\`
# Otherwise, the path is \`exercises/NAME.ts\`
# dir = "???"

# tslings expects the exercise to contain \`node:test\` tests and runs them with \`node --test\`.
# You can optionally disable testing by setting \`test\` to \`false\` (the default is \`true\`).
# In that case, the file is run with \`node\` and its output is shown. The exercise is done
# when it type-checks, passes the lints and runs successfully.
# test = true

# tslings always lints exercises. The rules that would silence the type checker (\`any\`, even
# from \`JSON.parse\`, \`as\`, the non-null assertion \`!\` and \`@ts-\` comments) are always errors.
# Style rules (\`no-var\`, \`eqeqeq\`, \`prefer-const\`) are warnings. You can optionally set
# \`strict_lint\` to \`true\` (the default is \`false\`) to only consider the exercise as done
# when there are no warnings left.
# strict_lint = false

# Optional list of lint rules the exercise is allowed to break, when breaking them is the lesson.
# allow_lints = ["no-ts-comment"]

# Optional list of files in the exercise's directory that the exercise imports (sibling modules).
# Learners don't edit them. If there is a solution, its directory needs an identical copy.
# extra_files = ["shapes.ts"]

# A multi-line hint to be shown to users on request.
hint = """???"""

# Optional explanations shown below specific errors, keyed by TypeScript error code or lint rule.
# Use them for the error you expect the learner to see first.
# [exercises.error_notes]
# TS2322 = """???"""
`;
const README = `# tslings

Welcome to these community tslings exercises 😃

First, [install tslings using the official instructions](${REPOSITORY_URL}) ✅

Then, clone this repository, open a terminal in this directory and run \`tslings\` to get started with the exercises 🚀
`;
export function devNew(path, noGit) {
    try {
        mkdirSync(path);
    }
    catch (error) {
        throw new Error(`Failed to create the directory ${path}`, { cause: error });
    }
    write(`Created the directory ${path}\n`);
    process.chdir(path);
    if (!noGit) {
        const result = spawnSync("git", ["init"], { stdio: "inherit" });
        if (result.error !== undefined)
            throw new Error("Failed to run `git init`", { cause: result.error });
        if (result.status !== 0)
            throw new Error("`git init` didn't run successfully. See the possible error message above");
    }
    const createDir = (dir) => {
        mkdirSync(dir);
        write(`Created the directory ${path}/${dir}\n`);
    };
    const writeFile = (file, content) => {
        writeFileSync(file, content);
        // Spaces to align with `createDir`.
        write(`Created the file      ${path}/${file}\n`);
    };
    writeFile(".gitignore", GITIGNORE);
    createDir("exercises");
    createDir("solutions");
    writeFile("info.toml", INFO_FILE);
    writeTypeScriptSetup("community-exercises");
    for (const file of ["tsconfig.json", "type-assert.ts", "package.json"]) {
        write(`Created the file      ${path}/${file}\n`);
    }
    writeFile("README.md", README);
    write("\nInitialization done ✓\n");
}
