// The `tslings` command.

import { existsSync, statSync } from "node:fs";
import { AppState } from "./app-state.ts";
import { type Args, parseCliArgs } from "./cli.ts";
import { runDevCommand } from "./dev.ts";
import { createEditor } from "./editor.ts";
import { formatError } from "./errors.ts";
import { exerciseLink, ExerciseRunner } from "./exercise.ts";
import { CURRENT_FORMAT_VERSION, loadInfoFile } from "./info-file.ts";
import { init } from "./init.ts";
import { nodeVersionError } from "./node-version.ts";
import { run } from "./run.ts";
import {
  clearTerminal,
  installTerminalCleanup,
  paint,
  pressEnterPrompt,
  stderrColor,
  stdoutColor,
  stdoutIsTerminal,
  write,
} from "./term.ts";
import { watch } from "./watch.ts";
import { detectSource, writeCheckerConfig } from "./workspace.ts";

const FORMAT_VERSION_HIGHER_ERR = `The format version specified in the \`info.toml\` file is higher than the last one supported.
It is possible that you have an outdated version of tslings.
Try to install the latest tslings version first.`;

const PRE_INIT_ART = String.raw`
       Welcome to...
  _       _ _
 | |_ ___| (_)_ __   __ _ ___
 | __/ __| | | '_ \ / _${"`"} / __|
 | |_\__ \ | | | | | (_| \__ \
  \__|___/_|_|_| |_|\__, |___/
                    |___/
`;

const PRE_INIT_MSG = `${paint("blue", PRE_INIT_ART, stdoutColor)}
The \`exercises/\` directory couldn't be found in the current directory.
If you are just starting with tslings, run the command \`tslings init\` to initialize it.
`;

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** Run the command and return the exit code. */
async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  if (parsed.kind === "exit") {
    if (parsed.stdout !== undefined) process.stdout.write(parsed.stdout);
    if (parsed.stderr !== undefined) process.stderr.write(parsed.stderr);
    return parsed.code;
  }
  const { args } = parsed;
  installTerminalCleanup();

  switch (args.command.kind) {
    case "init":
      try {
        await init({ noInstall: args.command.noInstall });
      } catch (error) {
        throw new Error("Initialization failed", { cause: error });
      }
      return 0;
    case "dev-new":
    case "dev-check":
    case "dev-update":
      await runDevCommand(args.command);
      return 0;
    default:
      break;
  }

  if (!isDirectory("exercises")) {
    write(PRE_INIT_MSG);
    return 1;
  }

  const { info, local } = loadInfoFile();
  if (info.formatVersion > CURRENT_FORMAT_VERSION) throw new Error(FORMAT_VERSION_HIGHER_ERR);

  const source = detectSource(local);
  const vsCodeTerm = process.env.TERM_PROGRAM === "vscode";
  // Only the watch mode opens files in the editor.
  const editor = args.noEditor || args.command.kind !== "watch" ? undefined : createEditor(args.editCmd, vsCodeTerm);
  const runner = new ExerciseRunner(writeCheckerConfig(source));

  try {
    const { appState, stateFileStatus } = AppState.load({
      exercises: info.exercises,
      finalMessage: info.finalMessage,
      source,
      runner,
      editor,
      vsCodeTerm,
    });

    // Show the welcome message if the state file doesn't exist yet.
    const welcomeMessage = info.welcomeMessage.trim();
    if (welcomeMessage !== "" && stateFileStatus === "not-read") {
      write(`${clearTerminal()}${welcomeMessage}\n\nPress ENTER to continue `);
      await pressEnterPrompt();
      write(clearTerminal());
      // Save the state now, so the welcome message is only shown once.
      appState.write();
    }

    return await runCommand(args, appState);
  } finally {
    runner.close();
  }
}

async function runCommand(args: Args, appState: AppState): Promise<number> {
  const { command } = args;
  switch (command.kind) {
    case "watch": {
      if (!stdoutIsTerminal || process.stdin.isTTY !== true) {
        throw new Error("Unsupported or missing terminal/TTY");
      }
      await watch(appState, args.manualRun);
      await appState.closeEditor();
      return 0;
    }

    case "run":
      if (command.name !== undefined) appState.setCurrentExerciseByName(command.name);
      return run(appState);

    case "check-all": {
      const firstPending = await appState.checkAllExercises();
      if (firstPending === undefined) {
        appState.renderFinalMessage();
        return 0;
      }
      if (appState.currentExercise.done) appState.setCurrentExerciseInd(firstPending);

      const pending = appState.nPending;
      write(pending === 1 ? "\nOne exercise pending: " : `\n${pending}/${appState.exercises.length} exercises pending. The first: `);
      write(`${exerciseLink(appState.currentExercise, appState.emitFileLinks)}\n`);
      return 1;
    }

    case "reset":
      appState.setCurrentExerciseByName(command.name);
      appState.resetCurrentExercise();
      write(`The exercise ${exerciseLink(appState.currentExercise, appState.emitFileLinks)} has been reset\n`);
      return 0;

    case "hint":
      if (command.name !== undefined) appState.setCurrentExerciseByName(command.name);
      write(`Current exercise: ${exerciseLink(appState.currentExercise, appState.emitFileLinks)}\n\n`);
      write(`Hint:\n${appState.currentExercise.hint.trim()}\n`);
      return 0;

    default:
      // `init` and `dev` were handled before loading the exercises.
      return 0;
  }
}

const versionError = nodeVersionError();
if (versionError !== undefined) {
  process.stderr.write(`${versionError}\n`);
  process.exitCode = 1;
} else {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(formatError(error, stderrColor));
    if (process.env.TSLINGS_DEBUG !== undefined && error instanceof Error) {
      process.stderr.write(`\n${error.stack ?? ""}\n`);
    }
    process.exitCode = 1;
  }
}
