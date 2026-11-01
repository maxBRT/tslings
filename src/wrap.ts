// Wrapping the prose and the types of rendered problems to the terminal width,
// so that the terminal never cuts a word in two ("Did you mean 'fir" /
// "stName'?").

/** How a text may be broken into lines. */
export type WrapMode = "prose" | "type";

interface Token {
  readonly text: string;
  /** The pieces a span can be broken into when it's wider than a whole line. */
  readonly parts: readonly string[];
}

/**
 * Wrap `text` into lines of at most `firstWidth` columns for the first line
 * and `restWidth` for the others. Each `\n` starts a new line.
 *
 * Prose breaks at spaces, but not inside `code spans` or 'quoted' spans
 * (TypeScript quotes types: `type '{ a: string; }'`), unless a span alone is
 * wider than a line. Types break after `;`, `,`, `{` and `=>`, and before `|`
 * and `&`, never inside a string literal or before a closing `}`. A single word
 * wider than a line stays whole.
 */
export function wrapText(text: string, firstWidth: number, restWidth: number, mode: WrapMode = "prose"): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const tokens = mode === "prose" ? proseTokens(paragraph) : typeTokens(paragraph);
    let line = "";
    const width = (): number => Math.max(1, lines.length === 0 ? firstWidth : restWidth);
    const place = (word: string): void => {
      if (line === "") line = word;
      else if (line.length + 1 + word.length <= width()) line = `${line} ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    };
    for (const token of tokens) {
      const room = line === "" ? width() : width() - line.length - 1;
      // A span that fits on a line of its own moves there whole; a wider one is broken up.
      // At the start of a line, it already is on a line of its own (the first may be narrower).
      const fitsNextLine = line !== "" && token.text.length <= restWidth;
      if (token.text.length <= room || token.parts.length <= 1 || fitsNextLine) place(token.text);
      else for (const part of token.parts) place(part);
    }
    lines.push(line);
  }
  return lines;
}

/** Words of prose; a `code span` or a 'quoted' span is one token. */
function proseTokens(paragraph: string): Token[] {
  const tokens: Token[] = [];
  let word = "";
  let span: "`" | "'" | undefined;
  const push = (): void => {
    if (word !== "") tokens.push({ text: word, parts: word.split(" ").filter((part) => part !== "") });
    word = "";
  };
  for (let index = 0; index < paragraph.length; index++) {
    const char = paragraph.charAt(index);
    if (span === undefined) {
      if (char === " ") {
        push();
        continue;
      }
      if (char === "`") span = "`";
      // An apostrophe inside a word ("doesn't") doesn't open a span.
      else if (char === "'" && /^[([{"]*$/.test(word)) span = "'";
    } else if (char === span && (span === "`" || /^$|[\s.,;:!?)\]}]/.test(paragraph.charAt(index + 1)))) {
      span = undefined;
    }
    word += char;
  }
  if (span !== undefined) {
    // A quote that never closes was an apostrophe after all: split what follows it into words.
    const [head = "", ...rest] = word.split(" ");
    word = head;
    push();
    for (const part of rest) {
      word = part;
      push();
    }
  }
  push();
  return tokens;
}

/** Pieces of a type, split where a line break reads well. */
function typeTokens(type: string): Token[] {
  const tokens: Token[] = [];
  let piece = "";
  let quote: string | undefined;
  for (let index = 0; index < type.length; index++) {
    const char = type.charAt(index);
    if (quote !== undefined) {
      if (char === "\\") {
        piece += char + type.charAt(index + 1);
        index++;
        continue;
      }
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === " ") {
      const previous = type.charAt(index - 1);
      const next = type.charAt(index + 1);
      if ((";,{".includes(previous) && next !== "}") || "|&".includes(next) || type.slice(index - 2, index) === "=>") {
        if (piece !== "") tokens.push({ text: piece, parts: [piece] });
        piece = "";
        continue;
      }
    }
    piece += char;
  }
  if (piece !== "") tokens.push({ text: piece, parts: [piece] });
  return tokens;
}
