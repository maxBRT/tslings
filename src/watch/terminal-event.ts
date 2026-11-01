// Turn key presses into watch mode events.

import type { Key } from "../input.ts";
import type { InputPause, WatchEvent } from "./events.ts";

/**
 * - `normal`: keys are commands.
 * - `confirm`: the reset prompt waits for `y` or `n`.
 * - `answered`: the prompt got its answer; keys are ignored until `unpause`.
 * - `stopped`: after `l` or `q`, the watch mode is ending.
 */
type Mode = "normal" | "confirm" | "answered" | "stopped";

export class TerminalEventHandler {
  #mode: Mode = "normal";
  readonly #pause: InputPause;
  readonly #manualRun: boolean;
  readonly #send: (event: WatchEvent) => void;

  constructor(pause: InputPause, manualRun: boolean, send: (event: WatchEvent) => void) {
    this.#pause = pause;
    this.#manualRun = manualRun;
    this.#send = send;
  }

  /** Back to normal once the answer to the reset prompt was handled. */
  unpause(): void {
    if (this.#mode === "confirm" || this.#mode === "answered") this.#mode = "normal";
  }

  handleKey(key: Key): void {
    if (key.name !== "char") return;
    const char = key.char;

    switch (this.#mode) {
      case "stopped":
      case "answered":
        return;
      case "confirm":
        // Only the first answer counts: typing `yy` mustn't reset the exercise twice.
        if (char === "y" || char === "Y") {
          this.#mode = "answered";
          this.#send({ kind: "input", input: "confirm" });
        } else if (char === "n" || char === "N") {
          this.#mode = "answered";
          this.#send({ kind: "input", input: "cancel" });
        }
        return;
      case "normal":
        break;
    }

    // Ignore keys until checking the exercise is done.
    if (this.#pause.paused) return;

    switch (char) {
      case "n":
        this.#send({ kind: "input", input: "next" });
        break;
      case "r":
        if (this.#manualRun) this.#send({ kind: "input", input: "run" });
        break;
      case "h":
        this.#send({ kind: "input", input: "hint" });
        break;
      case "l":
        this.#mode = "stopped";
        this.#send({ kind: "input", input: "list" });
        break;
      case "x":
        // Wait for the answer to the confirmation prompt.
        this.#mode = "confirm";
        this.#send({ kind: "input", input: "reset" });
        break;
      case "q":
        this.#mode = "stopped";
        this.#send({ kind: "input", input: "quit" });
        break;
    }
  }
}
