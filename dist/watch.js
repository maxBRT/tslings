// The watch mode: rerun the current exercise whenever its file is saved, and
// react to single key presses.
import { KeyInput } from "./input.js";
import { list } from "./list.js";
import { restoreTerminal, suspend, write } from "./term.js";
import { EventQueue, InputPause } from "./watch/events.js";
import { watchExercises } from "./watch/file-watcher.js";
import { WatchState } from "./watch/state.js";
import { TerminalEventHandler } from "./watch/terminal-event.js";
const QUIT_MSG = `q

We hope you're enjoying learning TypeScript!
If you want to continue working on the exercises at a later point, you can simply run \`tslings\` again in this directory.
`;
const NOTIFY_ERR = `
The automatic detection of exercise file changes failed :(
Please try running \`tslings\` again.

If you keep getting this error, run \`tslings --manual-run\` to deactivate the file watcher.
You need to manually trigger running the current exercise using \`r\` then.
`;
function interrupt() {
    restoreTerminal();
    write("\n");
    process.exit(130);
}
async function runWatch(appState, manualRun, input) {
    const events = new EventQueue();
    const send = (event) => events.push(event);
    const pause = new InputPause();
    let watcher;
    if (!manualRun) {
        try {
            watcher = watchExercises(appState.exercises, pause, send);
        }
        catch (error) {
            throw new Error(NOTIFY_ERR, { cause: error });
        }
    }
    const terminal = new TerminalEventHandler(pause, manualRun, send);
    input.setHandler((key) => {
        if (key.name === "ctrl-c")
            interrupt();
        if (key.name === "ctrl-z") {
            suspend();
            send({ kind: "terminal-resume" });
            return;
        }
        terminal.handleKey(key);
    });
    const onResize = () => send({ kind: "terminal-resize", width: process.stdout.columns });
    process.stdout.on("resize", onResize);
    const state = new WatchState(appState, terminal, pause, manualRun, process.stdout.columns);
    // File changes that happen while the reset prompt waits for an answer.
    const deferred = [];
    try {
        await state.runCurrentExercise();
        for (;;) {
            const event = await events.next();
            if (state.awaitingResetConfirmation && !(event.kind === "input" && (event.input === "confirm" || event.input === "cancel"))) {
                if (event.kind === "file-change")
                    deferred.push(event);
                else if (event.kind === "terminal-resize")
                    state.updateTermWidth(event.width);
                // Back from Ctrl+Z: show the question again.
                else if (event.kind === "terminal-resume")
                    state.resetExercise();
                else if (event.kind === "watcher-error")
                    throw new Error(NOTIFY_ERR, { cause: event.error });
                continue;
            }
            switch (event.kind) {
                case "input":
                    switch (event.input) {
                        case "next": {
                            const progress = await state.nextExercise();
                            if (progress === "all-done")
                                return "shutdown";
                            if (progress === "new-pending") {
                                await state.runCurrentExercise();
                                if (state.done) {
                                    // An exercise passes although it wasn't marked as done.
                                    // Check all exercises to fix the state file.
                                    const checked = await state.checkAllExercises();
                                    if (checked === "all-done")
                                        return "shutdown";
                                    if (checked === "new-pending")
                                        await state.runCurrentExercise();
                                    else
                                        state.render();
                                }
                            }
                            break;
                        }
                        case "run":
                            await state.runCurrentExercise();
                            break;
                        case "hint":
                            state.showHint();
                            break;
                        case "list":
                            return "list";
                        case "reset":
                            state.resetExercise();
                            break;
                        case "confirm":
                            await state.confirmReset();
                            for (const change of deferred.splice(0))
                                send(change);
                            break;
                        case "cancel":
                            state.cancelReset();
                            for (const change of deferred.splice(0))
                                send(change);
                            break;
                        case "quit":
                            write(QUIT_MSG);
                            return "shutdown";
                    }
                    break;
                case "file-change":
                    await state.handleFileChange(event.exerciseInd);
                    break;
                case "terminal-resize":
                    state.updateTermWidth(event.width);
                    break;
                case "terminal-resume":
                    state.render();
                    break;
                case "watcher-error":
                    throw new Error(NOTIFY_ERR, { cause: event.error });
            }
        }
    }
    finally {
        watcher?.close();
        process.stdout.off("resize", onResize);
        input.setHandler(() => { });
    }
}
/** Run the watch mode until the learner quits. `manualRun` disables the file watcher. */
export async function watch(appState, manualRun) {
    // Raw mode: single key presses, no echo.
    const input = new KeyInput(() => { });
    try {
        for (;;) {
            if ((await runWatch(appState, manualRun, input)) === "shutdown")
                break;
            // Leaving the watch mode and restarting it afterwards is much simpler
            // than pausing everything while the list is shown.
            await list(appState, input);
        }
    }
    finally {
        input.stop();
    }
}
