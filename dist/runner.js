// Runs an exercise with Node's built-in TypeScript support.
//
// Node erases the types and runs the file as-is, so what learners write is
// exactly what runs. Test exercises use Node's built-in test runner.
import { spawn } from "node:child_process";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
export const DEFAULT_TIMEOUT_MS = 15_000;
/** tslings' test reporter, next to this file: `.ts` in `src/`, `.js` once built to `dist/`. */
const TEST_REPORTER = fileURLToPath(new URL(`./test-reporter${extname(import.meta.filename)}`, import.meta.url));
export function runFile(file, options) {
    const args = options.test
        ? ["--test", `--test-reporter=${TEST_REPORTER}`, "--disable-warning=ExperimentalWarning", file]
        : ["--disable-warning=ExperimentalWarning", file];
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, args, {
            cwd: options.cwd,
            env: exerciseEnv(options.color),
            stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
        child.stderr.setEncoding("utf8").on("data", (chunk) => (output += chunk));
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        child.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            if (timedOut) {
                output += `\nThe exercise was stopped after ${Math.round((options.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} seconds. Is there an infinite loop, or a promise that never settles?\n`;
            }
            resolvePromise({ success: code === 0 && !timedOut, output, timedOut });
        });
    });
}
/** The environment of the exercise: colours as requested, and nothing that changes how Node runs it. */
function exerciseEnv(color) {
    const env = { ...process.env, FORCE_COLOR: color ? "1" : "0", NO_COLOR: color ? "" : "1", NODE_OPTIONS: "" };
    // Set when tslings itself runs inside `node --test`: the exercise's test runner would then
    // report to that parent instead of printing results and failing.
    delete env.NODE_TEST_CONTEXT;
    return env;
}
