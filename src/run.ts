// `tslings run [name]`: check one exercise and print the result.

import type { AppState } from "./app-state.ts";
import { exerciseLink, solutionLinkLine } from "./exercise.ts";
import { paint, stdoutColor, write } from "./term.ts";

/** Returns the process exit code. */
export async function run(appState: AppState): Promise<number> {
  appState.restoreCurrentExerciseFiles();
  const exercise = appState.currentExercise;
  const { success, output } = await appState.runner.runExercise(exercise, { color: stdoutColor });
  write(output.endsWith("\n") || output === "" ? output : `${output}\n`);

  if (!success) {
    appState.setPending(appState.currentExerciseInd);
    write(`Ran ${exerciseLink(exercise, appState.emitFileLinks)} with errors\n`);
    return 1;
  }

  write(`${paint("green", `✓ Successfully ran ${exercise.path}`)}\n`);

  const solution = appState.currentSolutionPath();
  if (solution !== undefined) {
    write(`\n${solutionLinkLine(solution, appState.emitFileLinks)}\n`);
  }

  const progress = await appState.doneCurrentExercise(false);
  if (progress !== "all-done") {
    write(`Next exercise: ${exerciseLink(appState.currentExercise, appState.emitFileLinks)}\n`);
  }
  return 0;
}
