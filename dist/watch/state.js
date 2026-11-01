// The watch mode screen: the output of the current exercise, the hint, the
// progress bar and the key prompt.
import { exerciseLink, solutionLinkLine } from "../exercise.js";
import { clearTerminal, paint, progressBar, stdoutColor, write } from "../term.js";
/**
 * Problems shown in full in the watch mode. More would push the first one, the
 * most useful, off the screen; the others are only counted.
 */
export const WATCH_MAX_PROBLEMS = 3;
export class WatchState {
    #appState;
    #terminal;
    #pause;
    #manualRun;
    #output = "";
    #showHint = false;
    #doneStatus = { done: false };
    #termWidth;
    #awaitingResetConfirmation = false;
    constructor(appState, terminal, pause, manualRun, termWidth) {
        this.#appState = appState;
        this.#terminal = terminal;
        this.#pause = pause;
        this.#manualRun = manualRun;
        this.#termWidth = termWidth;
    }
    get done() {
        return this.#doneStatus.done;
    }
    /** The reset prompt is waiting for `y` or `n`. */
    get awaitingResetConfirmation() {
        return this.#awaitingResetConfirmation;
    }
    async runCurrentExercise() {
        await this.#pause.during(async () => {
            const appState = this.#appState;
            write(`\nChecking the exercise \`${appState.currentExercise.name}\`. Please wait…\n`);
            this.#showHint = false;
            const restored = appState.restoreCurrentExerciseFiles(stdoutColor);
            const exercise = appState.currentExercise;
            // The editor opens while the exercise is checked.
            const [, { success, output }] = await Promise.all([
                appState.openEditor(),
                appState.runner.runExercise(exercise, { color: stdoutColor, maxProblems: WATCH_MAX_PROBLEMS }),
            ]);
            const shown = `${restored}${output}`.trimEnd();
            this.#output = shown === "" ? "" : `${shown}\n\n`;
            if (success) {
                this.#doneStatus = { done: true, solutionPath: appState.currentSolutionPath() };
            }
            else {
                appState.setPending(appState.currentExerciseInd);
                this.#doneStatus = { done: false };
            }
            this.render();
        });
    }
    /** Ask for confirmation; `confirmReset` or `cancelReset` follows. */
    resetExercise() {
        this.#awaitingResetConfirmation = true;
        write(`${clearTerminal()}Resetting will undo all your changes to the file ${this.#appState.currentExercise.path}\nReset (y/n)? `);
    }
    async confirmReset() {
        this.#awaitingResetConfirmation = false;
        await this.#appState.closeEditor();
        this.#appState.resetCurrentExercise();
        // Otherwise, the file watcher reruns the exercise.
        if (this.#manualRun)
            await this.runCurrentExercise();
        this.#terminal.unpause();
    }
    cancelReset() {
        this.#awaitingResetConfirmation = false;
        this.render();
        this.#terminal.unpause();
    }
    async handleFileChange(exerciseInd) {
        if (exerciseInd === this.#appState.currentExerciseInd)
            await this.runCurrentExercise();
    }
    /** Move on to the next exercise if the current one is done. */
    async nextExercise() {
        if (!this.done)
            return "current-pending";
        return this.#pause.during(() => this.#appState.doneCurrentExercise(true));
    }
    showHint() {
        if (!this.#showHint) {
            this.#showHint = true;
            this.render();
        }
    }
    /** Check all exercises (the current one passed although it wasn't marked as done). */
    async checkAllExercises() {
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
    updateTermWidth(width) {
        if (this.#termWidth !== width) {
            this.#termWidth = width;
            if (!this.#awaitingResetConfirmation)
                this.render();
        }
    }
    render() {
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
    #prompt() {
        const key = (name, rest) => `${paint("bold", name)}${rest}`;
        let prompt = "";
        if (this.done)
            prompt += `${paint("bold", "n")}:${paint("underline", "next")} / `;
        if (this.#manualRun)
            prompt += key("r", ":run / ");
        if (!this.#showHint)
            prompt += key("h", ":hint / ");
        prompt += key("l", ":list / ") + key("x", ":reset / ") + key("q", ":quit ? ");
        return prompt;
    }
}
