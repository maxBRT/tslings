// Renders problems the way rustc does: a header with the error code, the
// location, a code frame with carets under the faulty span, then notes.
//
//   error[TS2322]: Type 'string' is not assignable to type 'number'.
//    --> exercises/01_variables/variables2.ts:7:7
//     |
//   7 | const count: number = "three";
//     |       ^^^^^
//     = note: ...
//
// Messages, notes and types are wrapped to the terminal width, so that the
// terminal never cuts a word; code frames never are.

import { basename } from "node:path";
import { styleText } from "node:util";
import type { Problem } from "./checker.ts";
import { exerciseNoteFor, noteFor } from "./notes.ts";
import { displayRelative } from "./paths.ts";
import { outputWidth } from "./term.ts";
import type { ShownType } from "./type-tests.ts";
import { wrapText } from "./wrap.ts";

type Style = Parameters<typeof styleText>[0];

export interface RenderOptions {
  /** Paths are shown relative to this directory. */
  readonly cwd: string;
  readonly color: boolean;
  /**
   * Per-exercise explanations keyed by `TS2322` or a lint rule name, optionally
   * followed by a text the message must contain. They win over built-in notes.
   */
  readonly notes?: Readonly<Record<string, string>>;
  /** Messages, notes and types are wrapped to this many columns (code frames never are). */
  readonly width?: number;
  /** Show the first problems in full and only count the others (the watch mode). */
  readonly maxProblems?: number;
}

/** Narrower than this, wrapping would leave a word or two per line: lines stay longer instead. */
const MIN_TEXT_WIDTH = 24;

export function renderProblems(
  problems: readonly Problem[],
  sources: ReadonlyMap<string, string>,
  options: RenderOptions,
): string {
  const paint = (style: Style, text: string): string =>
    options.color && text !== "" ? styleText(style, text, { validateStream: false }) : text;
  const width = options.width ?? outputWidth();
  /** `text` wrapped into lines that start at column `start`. */
  const wrapAt = (text: string, start: number): string[] => {
    const room = Math.max(MIN_TEXT_WIDTH, width - start);
    return wrapText(text, room, room);
  };

  // A note is shown in full under the first error it explains, not repeated under each one.
  const shownNotes = new Set<string>();
  const shown = options.maxProblems === undefined ? problems : problems.slice(0, Math.max(1, options.maxProblems));

  const blocks = shown.map((problem) => {
    const lines: string[] = [];
    const color: "red" | "yellow" = problem.severity === "error" ? "red" : "yellow";
    const label = `${problem.severity}[${problem.code}]`;
    // The message's next lines start under its first one, unless the label takes half the line.
    const headerIndent = label.length + 2 <= width / 2 ? label.length + 2 : 4;
    const [first = "", ...rest] = wrapText(
      problem.message,
      Math.max(MIN_TEXT_WIDTH, width - label.length - 2),
      Math.max(MIN_TEXT_WIDTH, width - headerIndent),
    );
    lines.push(`${paint(["bold", color], label)}${paint("bold", `: ${first}`)}`);
    for (const line of rest) lines.push(`${" ".repeat(headerIndent)}${paint("bold", line)}`);

    const source = sources.get(problem.file);
    if (source !== undefined && problem.file !== "") {
      lines.push(...codeFrame(problem.file, source, problem.start, problem.end, color, paint, options.cwd));
    } else if (problem.file !== "") {
      lines.push(` ${paint(["bold", "blue"], "-->")} ${displayPath(problem.file, options.cwd)}`);
    }

    const gutter = " ".repeat(gutterWidth(source, problem.end));
    const equals = `${gutter} ${paint(["bold", "blue"], "=")}`;
    /** `= name: text`, or `= text` without a name, the text's next lines aligned on its first one. */
    const field = (name: string | undefined, text: string, style: Style = "bold"): void => {
      // The message chain shows its depth with leading spaces.
      const depth = name === undefined ? (/^ */.exec(text)?.[0] ?? "") : "";
      const prefix = name === undefined ? depth : `${name}: `;
      const start = gutter.length + 3 + prefix.length;
      const [head = "", ...tail] = wrapAt(text.slice(depth.length), start);
      lines.push(`${equals} ${name === undefined ? depth : `${paint(style, name)}: `}${head}`);
      for (const line of tail) lines.push(`${" ".repeat(start)}${line}`);
    };

    for (const detail of problem.details) field(undefined, detail);
    lines.push(...typeLines(problem.types ?? [], gutter, equals, width));
    if (problem.typeNote !== undefined) field("note", problem.typeNote);
    for (const related of problem.related) {
      const relatedSource = isLibraryFile(related.file) ? undefined : sources.get(related.file);
      const path = displayPath(related.file, options.cwd);
      const where = relatedSource === undefined ? path : `${path}:${formatPosition(relatedSource, related.start)}`;
      // Right where the error is, the location would only repeat the header's.
      const samePlace = related.file === problem.file && related.start === problem.start;
      field("related", samePlace ? related.message : `${related.message} (${where})`);
    }

    const note = exerciseNoteFor(options.notes, problem) ?? problem.note ?? noteFor(problem.code);
    if (note !== undefined && !shownNotes.has(note)) {
      shownNotes.add(note);
      field("help", note, ["bold", "cyan"]);
    }
    return lines.join("\n");
  });

  const errors = problems.filter((problem) => problem.severity === "error").length;
  const warnings = problems.length - errors;
  const summary: string[] = [];
  if (errors > 0) summary.push(paint(["bold", "red"], `${errors} error${errors === 1 ? "" : "s"}`));
  if (warnings > 0) summary.push(paint(["bold", "yellow"], `${warnings} warning${warnings === 1 ? "" : "s"}`));

  const hidden = problems.slice(shown.length);
  let more = "";
  if (hidden.length > 0) {
    const [count, advice] = moreProblems(hidden);
    // Too long for one line, the advice goes on the next one, under the count.
    if (advice === undefined) more = `${count}\n\n`;
    else if (count.length + 1 + advice.length <= width) more = `${count} ${advice}\n\n`;
    else more = `${count}\n${wrapAt(advice, 4).map((line) => `    ${line}`).join("\n")}\n\n`;
  }
  return `${blocks.join("\n\n")}\n\n${more}${summary.join(", ")}\n`;
}

/** `... and 7 more errors.` for the problems that aren't shown, and what to do about them. */
function moreProblems(hidden: readonly Problem[]): [count: string, advice?: string] {
  const errors = hidden.filter((problem) => problem.severity === "error").length;
  const warnings = hidden.length - errors;
  const counts: string[] = [];
  if (errors > 0) counts.push(`${errors} more error${errors === 1 ? "" : "s"}`);
  if (warnings > 0) counts.push(`${warnings} more warning${warnings === 1 ? "" : "s"}`);
  const count = `... and ${counts.join(" and ")}.`;
  return errors > 0 ? [count, "Fix the first ones: later errors are often caused by them."] : [count];
}

function codeFrame(
  file: string,
  source: string,
  start: number,
  end: number,
  color: "red" | "yellow",
  paint: (style: Style, text: string) => string,
  cwd: string,
): string[] {
  const lineStarts = computeLineStarts(source);
  const startLine = lineIndexAt(lineStarts, start);
  const endLine = lineIndexAt(lineStarts, Math.max(start, end - 1));
  const width = String(endLine + 1).length;
  const blank = " ".repeat(width);
  const bar = paint(["bold", "blue"], "|");

  const out = [
    `${blank}${paint(["bold", "blue"], "-->")} ${displayPath(file, cwd)}:${formatPosition(source, start)}`,
    `${blank} ${bar}`,
  ];

  // Long spans only show their first and last lines.
  const shown = endLine - startLine > 4 ? [startLine, startLine + 1, -1, endLine] : range(startLine, endLine);
  for (const lineIndex of shown) {
    if (lineIndex === -1) {
      out.push(`${paint(["bold", "blue"], "...")}`);
      continue;
    }
    const lineStart = lineStarts[lineIndex] ?? 0;
    const lineEnd = (lineStarts[lineIndex + 1] ?? source.length + 1) - 1;
    const text = source.slice(lineStart, lineEnd).replace(/\r$/, "").replaceAll("\t", "    ");
    const number = String(lineIndex + 1).padStart(width);
    out.push(`${paint(["bold", "blue"], number)} ${bar} ${text}`);

    const from = lineIndex === startLine ? start - lineStart : leadingWhitespace(text);
    const to = lineIndex === endLine ? Math.max(end - lineStart, from + 1) : text.length;
    if (to > from) {
      out.push(`${blank} ${bar} ${" ".repeat(from)}${paint(["bold", color], "^".repeat(to - from))}`);
    }
  }
  return out;
}

function computeLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function lineIndexAt(lineStarts: readonly number[], position: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((lineStarts[middle] ?? 0) <= position) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** `line:column`, both 1-based. */
export function formatPosition(source: string, position: number): string {
  const lineStarts = computeLineStarts(source);
  const line = lineIndexAt(lineStarts, position);
  return `${line + 1}:${position - (lineStarts[line] ?? 0) + 1}`;
}

function gutterWidth(source: string | undefined, end: number): number {
  if (source === undefined) return 0;
  return String(lineIndexAt(computeLineStarts(source), end) + 1).length;
}

function leadingWhitespace(text: string): number {
  return text.length - text.trimStart().length;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/** Files of TypeScript's standard library and of npm packages. */
export function isLibraryFile(file: string): boolean {
  return file.replaceAll("\\", "/").includes("/node_modules/");
}

/**
 * A path for the output, with `/` on every system. Library files get a short
 * name, like `lib.es2024.object.d.ts` or `@types/node/fs.d.ts`, instead of a
 * long path into tslings' own `node_modules`.
 */
function displayPath(file: string, cwd: string): string {
  const path = file.replaceAll("\\", "/");
  const index = path.lastIndexOf("/node_modules/");
  if (index === -1) return displayRelative(cwd, file);
  return /^lib\..*\.d\.ts$/.test(basename(path)) ? basename(path) : path.slice(index + "/node_modules/".length);
}

/**
 * `= expected: A` and `= found:    B`, aligned so they're easy to compare. A
 * union too long for one line gets one member per line, and a type still too
 * long is wrapped after its `;` and `,`.
 */
function typeLines(types: readonly ShownType[], gutter: string, equals: string, width: number): string[] {
  const labelWidth = Math.max(0, ...types.map((shown) => shown.label.length));
  const lines: string[] = [];
  for (const { label, type } of types) {
    const prefix = `${label}:${" ".repeat(labelWidth - label.length)} `;
    const start = gutter.length + 3 + prefix.length;
    const indent = " ".repeat(start);
    const room = (used: number): number => Math.max(MIN_TEXT_WIDTH, width - used);
    const members = splitUnion(type);
    if (start + type.length <= width || members.length < 2) {
      const [first = "", ...rest] = wrapText(type, room(start), room(start + 2), "type");
      lines.push(`${equals} ${prefix}${first}`, ...rest.map((line) => `${indent}  ${line}`));
      continue;
    }
    members.forEach((member, index) => {
      const [first = "", ...rest] = wrapText(member, room(index === 0 ? start : start + 2), room(start + 4), "type");
      lines.push(index === 0 ? `${equals} ${prefix}${first}` : `${indent}| ${first}`);
      for (const line of rest) lines.push(`${indent}    ${line}`);
    });
  }
  return lines;
}

/** The members of a union type as TypeScript prints it, without splitting nested types. */
export function splitUnion(type: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let index = 0; index < type.length; index++) {
    const char = type[index];
    if (quote !== undefined) {
      if (char === "\\") index++;
      else if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === "(" || char === "[" || char === "{" || char === "<") {
      depth++;
    } else if (char === ")" || char === "]" || char === "}" || (char === ">" && type[index - 1] !== "=")) {
      depth--;
    } else if (depth === 0 && type.startsWith(" | ", index - 1)) {
      members.push(type.slice(start, index - 1));
      start = index + 2;
    }
  }
  members.push(type.slice(start));
  return members;
}
