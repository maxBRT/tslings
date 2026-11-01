// What the watch mode reacts to, and the queue that delivers it one at a time.

export type InputEvent = "next" | "run" | "hint" | "list" | "reset" | "quit" | "confirm" | "cancel";

export type WatchEvent =
  | { readonly kind: "input"; readonly input: InputEvent }
  | { readonly kind: "file-change"; readonly exerciseInd: number }
  | { readonly kind: "terminal-resize"; readonly width: number }
  /** Back after Ctrl+Z and `fg`: the screen needs redrawing. */
  | { readonly kind: "terminal-resume" }
  | { readonly kind: "watcher-error"; readonly error: Error };

/**
 * Events are handled one after the other: while an exercise is being checked,
 * new events wait in the queue (or are dropped, see `InputPause`).
 */
export class EventQueue<T> {
  readonly #items: T[] = [];
  #waiting: ((item: T) => void) | undefined;

  push(item: T): void {
    const waiting = this.#waiting;
    if (waiting === undefined) {
      this.#items.push(item);
    } else {
      this.#waiting = undefined;
      waiting(item);
    }
  }

  next(): Promise<T> {
    if (this.#items.length > 0) {
      const [item] = this.#items.splice(0, 1);
      if (item !== undefined) return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      this.#waiting = resolve;
    });
  }
}

/**
 * Set while an exercise is being checked. Key presses and file changes that
 * happen meanwhile are ignored instead of queuing up reruns.
 */
export class InputPause {
  #paused = false;

  get paused(): boolean {
    return this.#paused;
  }

  async during<T>(work: () => Promise<T>): Promise<T> {
    this.#paused = true;
    try {
      return await work();
    } finally {
      this.#paused = false;
    }
  }
}
