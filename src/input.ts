// Keyboard and mouse input in raw mode: decode what the terminal sends into keys.

import { setRawMode } from "./term.ts";

export type Key =
  | { readonly name: "char"; readonly char: string }
  | {
      readonly name:
        | "enter"
        | "escape"
        | "backspace"
        | "tab"
        | "up"
        | "down"
        | "left"
        | "right"
        | "home"
        | "end"
        | "page-up"
        | "page-down"
        | "ctrl-c"
        | "ctrl-z"
        | "scroll-up"
        | "scroll-down";
    };

type KeyName = Exclude<Key, { name: "char" }>["name"];

const CSI_FINAL: Readonly<Record<string, KeyName>> = {
  A: "up",
  B: "down",
  C: "right",
  D: "left",
  H: "home",
  F: "end",
};

const CSI_TILDE: Readonly<Record<string, KeyName>> = {
  "1": "home",
  "7": "home",
  "4": "end",
  "8": "end",
  "5": "page-up",
  "6": "page-down",
};

/** Decode a chunk of terminal input. Unknown escape sequences are dropped. */
export function decodeKeys(data: string): Key[] {
  const keys: Key[] = [];
  const named = (name: KeyName): void => {
    keys.push({ name });
  };

  let index = 0;
  while (index < data.length) {
    const char = data.charAt(index);

    if (char === "\x1b") {
      const next = data.charAt(index + 1);
      if (next === "[") {
        index = decodeCsi(data, index + 2, named);
        continue;
      }
      if (next === "O" && index + 2 < data.length) {
        const key = CSI_FINAL[data.charAt(index + 2)];
        if (key !== undefined) named(key);
        index += 3;
        continue;
      }
      // A lone escape, or Alt+key, which tslings treats as escape.
      named("escape");
      index += next === "" || next === "\x1b" ? 1 : 2;
      continue;
    }

    if (char === "\r" || char === "\n") named("enter");
    else if (char === "\x7f" || char === "\b") named("backspace");
    else if (char === "\t") named("tab");
    else if (char === "\x03") named("ctrl-c");
    else if (char === "\x1a") named("ctrl-z");
    else {
      const codePoint = data.codePointAt(index) ?? 0;
      const symbol = String.fromCodePoint(codePoint);
      if (codePoint >= 0x20) keys.push({ name: "char", char: symbol });
      index += symbol.length;
      continue;
    }
    index++;
  }
  return keys;
}

/** Decode a CSI sequence starting after `ESC [`; returns the index after it. */
function decodeCsi(data: string, start: number, named: (name: KeyName) => void): number {
  // X10 mouse encoding: ESC [ M followed by three bytes.
  if (data.charAt(start) === "M" && start + 3 < data.length) {
    const button = data.charCodeAt(start + 1) - 32;
    if (button === 64) named("scroll-up");
    else if (button === 65) named("scroll-down");
    return start + 4;
  }

  let end = start;
  // Parameter and intermediate bytes, then one final byte.
  while (end < data.length && /[0-9;<=>?!"#$%&'()*+,\-./:]/.test(data.charAt(end))) end++;
  const params = data.slice(start, end);
  const final = data.charAt(end);

  if (params.startsWith("<") && (final === "M" || final === "m")) {
    // SGR mouse encoding: ESC [ < button ; column ; row M
    const button = Number(params.slice(1).split(";")[0]);
    if (final === "M" && button === 64) named("scroll-up");
    else if (final === "M" && button === 65) named("scroll-down");
  } else if (final === "~") {
    const key = CSI_TILDE[params.split(";")[0] ?? ""];
    if (key !== undefined) named(key);
  } else {
    const key = CSI_FINAL[final];
    if (key !== undefined) named(key);
  }
  return end + 1;
}

/**
 * Reads keys from stdin in raw mode and hands them to the current handler.
 * The watch mode and the list mode take turns being the handler.
 */
export class KeyInput {
  #handler: (key: Key) => void;
  readonly #onData = (data: string): void => {
    for (const key of decodeKeys(data)) this.#handler(key);
  };

  constructor(handler: (key: Key) => void) {
    this.#handler = handler;
    setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", this.#onData);
    process.stdin.resume();
  }

  setHandler(handler: (key: Key) => void): void {
    this.#handler = handler;
  }

  stop(): void {
    process.stdin.off("data", this.#onData);
    process.stdin.pause();
    setRawMode(false);
  }
}
