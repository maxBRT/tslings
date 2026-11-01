// Open the current exercise in the learner's editor: VS Code when tslings runs
// in its terminal, a Zellij pane, or any command given with `--edit-cmd`.
import { programExists, runCommand } from "./cmd.js";
import { closePane, editInPane, paneOpen } from "./editor/zellij.js";
import { splitShellWords } from "./shell-words.js";
/** Runs `PROGRAM ARGS… EXERCISE_PATH`. The program must not block (like `code`). */
class CommandEditor {
    #program;
    #args;
    constructor(program, args) {
        this.#program = program;
        this.#args = args;
    }
    async open(_exerciseInd, path) {
        await runCommand(this.#program, [...this.#args, path]);
    }
    async close() { }
}
/** Opens each exercise in a Zellij editor pane, and closes it when moving on. */
class ZellijEditor {
    #openPane;
    async open(exerciseInd, path) {
        if (this.#openPane !== undefined) {
            if (this.#openPane.exerciseInd === exerciseInd) {
                if (await paneOpen(this.#openPane.pane.id))
                    return;
            }
            else {
                await closePane(this.#openPane.pane.name);
            }
        }
        this.#openPane = { pane: await editInPane(path), exerciseInd };
    }
    async close() {
        const open = this.#openPane;
        this.#openPane = undefined;
        if (open !== undefined)
            await closePane(open.pane.name);
    }
}
/** Pick the editor integration, or `undefined` when there's none to use. */
export function createEditor(editCmd, vsCodeTerm) {
    if (vsCodeTerm) {
        for (const program of ["code", "codium"]) {
            if (programExists(program))
                return new CommandEditor(program, []);
        }
    }
    if (editCmd !== undefined) {
        let words;
        try {
            words = splitShellWords(editCmd);
        }
        catch (error) {
            throw new Error("Failed to parse the command in `--edit-cmd`", { cause: error });
        }
        const [program, ...args] = words;
        if (program === undefined)
            throw new Error("Program missing in `--edit-cmd`");
        return new CommandEditor(program, args);
    }
    if (process.env.ZELLIJ !== undefined && programExists("zellij")) {
        return new ZellijEditor();
    }
    return undefined;
}
