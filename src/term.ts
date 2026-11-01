// Terminal output: colours, cursor control, progress bars and file links.
//
// Everything that produces escape sequences lives here. Functions return
// strings instead of writing directly, so they're easy to test and to combine
// into one write (which avoids flickering).

import { pathToFileURL } from "node:url";
import { stripVTControlCharacters, styleText } from "node:util";

export type Style = Parameters<typeof styleText>[0];

/**
 * Whether `stream` should get ANSI colours: never when `NO_COLOR` is set or the
 * output isn't a terminal, always when `FORCE_COLOR` is set.
 */
export function supportsColor(stream: Pick<NodeJS.WriteStream, "isTTY" | "hasColors">, env: NodeJS.ProcessEnv = process.env): boolean {
  const force = env.FORCE_COLOR;
  if (force !== undefined && force !== "") return force !== "0" && force !== "false";
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (stream.isTTY !== true) return false;
  return stream.hasColors();
}

/** `process.stdout.isTTY` is `undefined`, not `false`, when stdout isn't a terminal. */
export const stdoutIsTerminal = process.stdout.isTTY === true;

/** Colours for everything tslings prints on stdout. */
export const stdoutColor = supportsColor(process.stdout);
export const stderrColor = supportsColor(process.stderr);

/** Apply a style when colours are enabled, return the plain text otherwise. */
export function paint(style: Style, text: string, color: boolean = stdoutColor): string {
  return color && text !== "" ? styleText(style, text, { validateStream: false }) : text;
}

/** Raw escape sequences. Only used when stdout is a terminal. */
export const ansi = {
  clearScreen: "\x1b[H\x1b[2J\x1b[3J",
  clearToEndOfLine: "\x1b[K",
  nextLine: "\x1b[1E",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  enterAlternateScreen: "\x1b[?1049h",
  leaveAlternateScreen: "\x1b[?1049l",
  disableLineWrap: "\x1b[?7l",
  enableLineWrap: "\x1b[?7h",
  // Button events (for the mouse wheel) in the SGR encoding.
  enableMouseCapture: "\x1b[?1000h\x1b[?1006h",
  disableMouseCapture: "\x1b[?1006l\x1b[?1000l",
  beginSynchronizedUpdate: "\x1b[?2026h",
  endSynchronizedUpdate: "\x1b[?2026l",
  saveCursor: "\x1b7",
  restoreCursor: "\x1b8",
  reverse: "\x1b[7m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
  moveTo: (row: number, column: number): string => `\x1b[${row + 1};${column + 1}H`,
} as const;

/** Clear the screen and its scrollback. Nothing when stdout isn't a terminal (logs stay readable). */
export function clearTerminal(): string {
  return stdoutIsTerminal ? ansi.clearScreen : "";
}

export function write(text: string): void {
  process.stdout.write(text);
}

export interface TerminalSize {
  readonly columns: number;
  readonly rows: number;
}

/** The terminal size, or 80×24 when stdout isn't a terminal. */
export function terminalSize(): TerminalSize {
  return { columns: process.stdout.columns ?? 80, rows: process.stdout.rows ?? 24 };
}

/**
 * Builds one line that never gets wider than `maxLen` columns: text that
 * doesn't fit is cut. Escape sequences don't count toward the width.
 * (rustlings' `MaxLenWriter`.)
 */
export class LineWriter {
  #out = "";
  #len = 0;
  readonly #maxLen: number;
  readonly #color: boolean;

  constructor(maxLen: number, color: boolean) {
    this.#maxLen = maxLen;
    this.#color = color;
  }

  /** Visible text, optionally styled. */
  text(text: string, style?: Style): this {
    const chars = Array.from(text);
    const room = Math.max(0, this.#maxLen - this.#len);
    if (room === 0 || chars.length === 0) return this;
    const shown = chars.length <= room ? text : chars.slice(0, room).join("");
    this.#out += style === undefined ? shown : paint(style, shown, this.#color);
    this.#len += Math.min(chars.length, room);
    return this;
  }

  /** Zero-width content: escape sequences. */
  raw(sequence: string): this {
    this.#out += sequence;
    return this;
  }

  /** Count extra columns, for characters that take two cells. */
  addWidth(width: number): this {
    this.#len += width;
    return this;
  }

  get length(): number {
    return this.#len;
  }

  toString(): string {
    return this.#out;
  }
}

/**
 * `Progress: [####>-----]  12/110`, as wide as the terminal.
 * Falls back to `Progress: 12/110` on very narrow terminals.
 */
export function progressBar(progress: number, total: number, termWidth: number, color: boolean = stdoutColor): string {
  const prefix = "Progress: [";
  const postfixWidth = "] xxx/xxx".length;
  const wrapperWidth = prefix.length + postfixWidth;
  const minLineWidth = wrapperWidth + 4;

  if (termWidth < minLineWidth) {
    return `Progress: ${progress}/${total}`;
  }

  const width = termWidth - wrapperWidth;
  const filled = total === 0 ? width : Math.floor((width * progress) / total);
  let bar = "#".repeat(filled);
  let rest = "";
  if (filled < width) {
    bar += ">";
    rest = "-".repeat(Math.max(0, width - filled - 1));
  }

  return `${prefix}${paint("green", bar, color)}${paint("red", rest, color)}] ${String(progress).padStart(3)}/${total}`;
}

/**
 * An OSC 8 hyperlink: terminals show `text` and open `canonicalPath` on click.
 * https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 */
export function terminalFileLink(text: string, canonicalPath: string): string {
  return `\x1b]8;;${pathToFileURL(canonicalPath).href}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/** A file path the learner can click: coloured, underlined, and a hyperlink when supported. */
export function filePath(path: string, canonicalPath: string | undefined, style: "blue" | "cyan", color: boolean = stdoutColor): string {
  const text = paint([style, "underline"], path, color);
  return canonicalPath === undefined ? text : terminalFileLink(text, canonicalPath);
}

/** Wait until the user presses ENTER (or stdin closes). */
export function pressEnterPrompt(): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const done = (): void => {
      stdin.off("data", onData);
      stdin.off("end", done);
      stdin.off("error", done);
      stdin.pause();
      write("\n");
      resolve();
    };
    const onData = (chunk: Buffer | string): void => {
      if (/[\r\n]/.test(chunk.toString())) done();
    };
    stdin.on("data", onData);
    stdin.once("end", done);
    stdin.once("error", done);
    stdin.resume();
  });
}

/** `Progress: 3/10`, updated in place on a terminal. Used by `tslings dev check`. */
export class ProgressCounter {
  readonly #total: number;
  readonly #live = stdoutIsTerminal;
  #counter = 0;

  constructor(total: number) {
    this.#total = total;
    if (this.#live) write(`Progress: 0/${total}`);
  }

  increment(): void {
    this.#counter++;
    if (this.#live) write(`\rProgress: ${this.#counter}/${this.#total}`);
  }

  finish(): void {
    // Logs only get the final count.
    write(this.#live ? "\n\n" : `Progress: ${this.#counter}/${this.#total}\n\n`);
  }
}

/** How many lines `text` takes on a terminal `columns` wide: long lines wrap. */
export function screenLines(text: string, columns: number): number {
  return text
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(stripVTControlCharacters(line).length / columns)), 0);
}

export type CheckProgress = "none" | "checking" | "done" | "pending";

/**
 * The grid of exercise numbers shown while checking all exercises. Numbers
 * turn blue while an exercise is checked, then green (done) or red (pending).
 * Without colours, a mark after each number tells the state.
 */
export class CheckProgressVisualizer {
  readonly #nCols: number;
  readonly #live: boolean;
  readonly #color: boolean;
  readonly #header: string;

  static readonly #styles = { none: "reset", checking: "blue", done: "green", pending: "red" } as const;
  static readonly #marks = { none: " ", checking: "?", done: "✓", pending: "✗" } as const;

  /**
   * @param live Redraw the grid as exercises are checked (on a terminal).
   * Otherwise, the grid is printed once at the end.
   */
  constructor(nExercises: number, terminal: TerminalSize, live: boolean = stdoutIsTerminal, color: boolean = stdoutColor) {
    this.#color = color;
    const legend = color
      ? `Color of exercise number: ${paint("blue", "Checking", true)} - ${paint("green", "Done", true)} - ${paint("red", "Pending", true)}`
      : "Mark after the exercise number: ? Checking - ✓ Done - ✗ Pending";
    this.#header = `Checking all exercises…\n${legend}\n`;

    // Numbers have up to 3 digits (4 with the mark), plus one space between cells.
    const cellWidth = color ? 4 : 5;
    this.#nCols = Math.max(1, Math.floor((terminal.columns + 1) / cellWidth));

    // The grid is redrawn in place below the title and the legend. Taller
    // than the screen, every redraw would scroll it into the scrollback.
    const height = screenLines(this.#header.trimEnd(), terminal.columns) + Math.ceil(nExercises / this.#nCols);
    this.#live = live && height <= terminal.rows;
  }

  /** Whether the grid is redrawn as exercises are checked. */
  get live(): boolean {
    return this.#live;
  }

  /** Clear the screen and print the title and the legend. */
  start(): void {
    if (this.#live) hideCursor();
    // The grid is drawn where the cursor is after the header, every time.
    write(clearTerminal() + this.#header + (this.#live ? ansi.saveCursor : ""));
  }

  /** Redraw the grid. Only does something when live; see `finish`. */
  update(progresses: readonly CheckProgress[]): void {
    if (this.#live) write(ansi.restoreCursor + this.grid(progresses));
  }

  /** The grid without escape sequences other than colours. */
  grid(progresses: readonly CheckProgress[]): string {
    let out = "";
    progresses.forEach((progress, index) => {
      const number = String(index + 1).padStart(3);
      out += this.#color
        ? paint(CheckProgressVisualizer.#styles[progress], number, true)
        : number + CheckProgressVisualizer.#marks[progress];
      if (index + 1 < progresses.length) {
        out += (index + 1) % this.#nCols === 0 ? "\n" : " ";
      }
    });
    return out;
  }

  /** Print the final grid (when not live) and show the cursor again. */
  finish(progresses: readonly CheckProgress[]): void {
    if (this.#live) {
      this.update(progresses);
      showCursor();
    } else {
      write(this.grid(progresses));
    }
    write("\n");
  }
}

// Terminal state that must be restored when tslings exits, even on a crash or Ctrl+C.
const terminalState = {
  rawMode: false,
  alternateScreen: false,
  cursorHidden: false,
};

export function setRawMode(enabled: boolean): void {
  if (process.stdin.isTTY === true) {
    process.stdin.setRawMode(enabled);
    terminalState.rawMode = enabled;
  }
}

export function hideCursor(): void {
  terminalState.cursorHidden = true;
  write(ansi.hideCursor);
}

export function showCursor(): void {
  terminalState.cursorHidden = false;
  write(ansi.showCursor);
}

export function enterAlternateScreen(): void {
  terminalState.alternateScreen = true;
  terminalState.cursorHidden = true;
  write(ansi.enterAlternateScreen + ansi.hideCursor + ansi.disableLineWrap + ansi.enableMouseCapture);
}

export function leaveAlternateScreen(): void {
  terminalState.alternateScreen = false;
  terminalState.cursorHidden = false;
  write(ansi.leaveAlternateScreen + ansi.showCursor + ansi.enableLineWrap + ansi.disableMouseCapture);
}

/** Put the terminal back the way we found it. Safe to call several times. */
export function restoreTerminal(): void {
  if (terminalState.alternateScreen) leaveAlternateScreen();
  if (terminalState.cursorHidden) showCursor();
  if (terminalState.rawMode) setRawMode(false);
}

/**
 * Stop tslings like Ctrl+Z does in a shell, and return once the shell resumes
 * it (`fg`). In raw mode, Ctrl+Z is a plain key, so tslings stops itself: the
 * whole process group, like the terminal would (an exercise being checked too).
 * Used by the watch mode only: the alternate screen isn't entered again.
 */
export function suspend(): void {
  // Windows has no job control.
  if (process.platform === "win32") return;
  const { rawMode, cursorHidden } = terminalState;
  restoreTerminal();
  process.kill(0, "SIGTSTP");
  // Execution continues here after `fg`.
  if (rawMode) setRawMode(true);
  if (cursorHidden) hideCursor();
}

let cleanupInstalled = false;

/** Restore the terminal on exit, crashes and termination signals. */
export function installTerminalCleanup(): void {
  if (cleanupInstalled) return;
  cleanupInstalled = true;
  process.on("exit", restoreTerminal);
  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGHUP", 129],
  ] as const) {
    process.on(signal, () => {
      restoreTerminal();
      process.exit(code);
    });
  }
}
