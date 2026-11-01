// The watch mode screen: the output of the current exercise, the hint, the
// progress bar and the key prompt.

import type { AppState, ExercisesProgress } from "../app-state.ts";
import { exerciseLink, solutionLinkLine } from "../exercise.ts";
import { clearTerminal, paint, progressBar, stdoutColor, write } from "../term.ts";
import type { InputPause } from "./events.ts";
import type { TerminalEventHandler } from "./terminal-event.ts";

type DoneStatus = { readonly done: true; readonly solutionPath: string | undefined } | { readonly done: false };

export class WatchState {
  readonly #appState: AppState;
  readonly #terminal: TerminalEventHandler;
  readonly #pause: InputPause;
  readonly #manualRun: boolean;
  #output = "";
  #showHint = false;
  #doneStatus: DoneStatus = { done: false };
  #termWidth: number;
  #awaitingResetConfirmation = false;

  constructor(appState: AppState, terminal: TerminalEventHandler, pause: InputPause, manualRun: boolean, termWidth: number) {
    this.#appState = appState;
    this.#terminal = terminal;
    this.#pause = pause;
    this.#manualRun = manualRun;
    this.#termWidth = termWidth;
  }

  get done(): boolean {
    return this.#doneStatus.done;
  }

  /** The reset prompt is waiting for `y` or `n`. */
  get awaitingResetConfirmation(): boolean {
    return this.#awaitingResetConfirmation;
  }

  async runCurrentExercise(): Promise<void> {
    await this.#pause.during(async () => {
      const appState = this.#appState;
      write(`\nChecking the exercise \`${appState.currentExercise.name}\`. Please wait…\n`);
      this.#showHint = false;

      const restored = appState.restoreCurrentExerciseFiles(stdoutColor);
      const exercise = appState.currentExercise;
      // The editor opens while the exercise is checked.
      const [, { success, output }] = await Promise.all([
        appState.openEditor(),
        appState.runner.runExercise(exercise, { color: stdoutColor }),
      ]);
      const shown = `${restored}${output}`.trimEnd();
      this.#output = shown === "" ? "" : `${shown}\n\n`;

      if (success) {
        this.#doneStatus = { done: true, solutionPath: appState.currentSolutionPath() };
      } else {
        appState.setPending(appState.currentExerciseInd);
        this.#doneStatus = { done: false };
      }
      this.render();
    });
  }

  /** Ask for confirmation; `confirmReset` or `cancelReset` follows. */
  resetExercise(): void {
    this.#awaitingResetConfirmation = true;
    write(`${clearTerminal()}Resetting will undo all your changes to the file ${this.#appState.currentExercise.path}\nReset (y/n)? `);
  }

  async confirmReset(): Promise<void> {
    this.#awaitingResetConfirmation = false;
    await this.#appState.closeEditor();
    this.#appState.resetCurrentExercise();
    // Otherwise, the file watcher reruns the exercise.
    if (this.#manualRun) await this.runCurrentExercise();
    this.#terminal.unpause();
  }

  cancelReset(): void {
    this.#awaitingResetConfirmation = false;
    this.render();
    this.#terminal.unpause();
  }

  async handleFileChange(exerciseInd: number): Promise<void> {
    if (exerciseInd === this.#appState.currentExerciseInd) await this.runCurrentExercise();
  }

  /** Move on to the next exercise if the current one is done. */
  async nextExercise(): Promise<ExercisesProgress> {
    if (!this.done) return "current-pending";
    return this.#pause.during(() => this.#appState.doneCurrentExercise(true));
  }

  showHint(): void {
    if (!this.#showHint) {
      this.#showHint = true;
      this.render();
    }
  }

  /** Check all exercises (the current one passed although it wasn't marked as done). */
  async checkAllExercises(): Promise<ExercisesProgress> {
    return this.#pause.during(async () => {
      const firstPending = await this.#appState.checkAllExercises();
      if (firstPending === undefined) {
        this.#appState.renderFinalMessage();
        return "all-done";
      }
      // Only change the exercise if the current one is done.
      if (this.#appState.currentExercise.done) {
        this.#appState.setCurrentExerciseInd(firstPending);
        return "new-pending";
      }
      return "current-pending";
    });
  }

  updateTermWidth(width: number): void {
    if (this.#termWidth !== width) {
      this.#termWidth = width;
      if (!this.#awaitingResetConfirmation) this.render();
    }
  }

  render(): void {
    const appState = this.#appState;
    const exercise = appState.currentExercise;
    // The newline prevents a shifted first line if clearing fails.
    let out = `\n${clearTerminal()}${this.#output}`;

    if (this.#showHint) {
      out += `${paint(["bold", "underline", "cyan"], "Hint")}\n${exercise.hint.trim()}\n\n`;
    }

    if (this.#doneStatus.done) {
      out += `${paint(["bold", "green"], "Exercise done ✓")}\n`;
      if (this.#doneStatus.solutionPath !== undefined) {
        out += solutionLinkLine(this.#doneStatus.solutionPath, appState.emitFileLinks);
      }
      out += "When done experimenting, enter `n` to move on to the next exercise\n\n";
    }

    out += progressBar(appState.nDone, appState.exercises.length, this.#termWidth);
    out += `\nCurrent exercise: ${exerciseLink(exercise, appState.emitFileLinks)}\n\n`;
    out += this.#prompt();
    write(out);
  }

  #prompt(): string {
    const key = (name: string, rest: string): string => `${paint("bold", name)}${rest}`;
    let prompt = "";
    if (this.done) prompt += `${paint("bold", "n")}:${paint("underline", "next")} / `;
    if (this.#manualRun) prompt += key("r", ":run / ");
    if (!this.#showHint) prompt += key("h", ":hint / ");
    prompt += key("l", ":list / ") + key("x", ":reset / ") + key("q", ":quit ? ");
    return prompt;
  }
}
