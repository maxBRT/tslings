// Open the current exercise in the learner's editor: VS Code when tslings runs
// in its terminal, a Zellij pane, or any command given with `--edit-cmd`.

import { programExists, runCommand } from "./cmd.ts";
import { closePane, editInPane, type PaneId, paneOpen } from "./editor/zellij.ts";
import { splitShellWords } from "./shell-words.ts";

export interface Editor {
  /** Show the exercise file. Called every time the exercise is run. */
  open(exerciseInd: number, path: string): Promise<void>;
  /** Close what `open` opened, if anything (before a reset, or on quit). */
  close(): Promise<void>;
}

/** Runs `PROGRAM ARGS… EXERCISE_PATH`. The program must not block (like `code`). */
class CommandEditor implements Editor {
  readonly #program: string;
  readonly #args: readonly string[];

  constructor(program: string, args: readonly string[]) {
    this.#program = program;
    this.#args = args;
  }

  async open(_exerciseInd: number, path: string): Promise<void> {
    await runCommand(this.#program, [...this.#args, path]);
  }

  async close(): Promise<void> {}
}

/** Opens each exercise in a Zellij editor pane, and closes it when moving on. */
class ZellijEditor implements Editor {
  #openPane: { readonly pane: PaneId; readonly exerciseInd: number } | undefined;

  async open(exerciseInd: number, path: string): Promise<void> {
    if (this.#openPane !== undefined) {
      if (this.#openPane.exerciseInd === exerciseInd) {
        if (await paneOpen(this.#openPane.pane.id)) return;
      } else {
        await closePane(this.#openPane.pane.name);
      }
    }
    this.#openPane = { pane: await editInPane(path), exerciseInd };
  }

  async close(): Promise<void> {
    const open = this.#openPane;
    this.#openPane = undefined;
    if (open !== undefined) await closePane(open.pane.name);
  }
}

/** Pick the editor integration, or `undefined` when there's none to use. */
export function createEditor(editCmd: string | undefined, vsCodeTerm: boolean): Editor | undefined {
  if (vsCodeTerm) {
    for (const program of ["code", "codium"]) {
      if (programExists(program)) return new CommandEditor(program, []);
    }
  }

  if (editCmd !== undefined) {
    let words: string[];
    try {
      words = splitShellWords(editCmd);
    } catch (error) {
      throw new Error("Failed to parse the command in `--edit-cmd`", { cause: error });
    }
    const [program, ...args] = words;
    if (program === undefined) throw new Error("Program missing in `--edit-cmd`");
    return new CommandEditor(program, args);
  }

  if (process.env.ZELLIJ !== undefined && programExists("zellij")) {
    return new ZellijEditor();
  }

  return undefined;
}
