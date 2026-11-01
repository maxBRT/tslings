// Renders problems the way rustc does: a header with the error code, the
// location, a code frame with carets under the faulty span, then notes.
//
//   error[TS2322]: Type 'string' is not assignable to type 'number'.
//    --> exercises/01_variables/variables2.ts:7:7
//     |
//   7 | const count: number = "three";
//     |       ^^^^^
//     = note: ...

import { basename, relative } from "node:path";
import { styleText } from "node:util";
import type { Problem } from "./checker.ts";
import { noteFor } from "./notes.ts";
import type { ShownType } from "./type-tests.ts";

type Style = Parameters<typeof styleText>[0];

export interface RenderOptions {
  /** Paths are shown relative to this directory. */
  readonly cwd: string;
  readonly color: boolean;
  /** Per-exercise explanations keyed by `TS2322` or lint rule name. They win over built-in notes. */
  readonly notes?: Readonly<Record<string, string>>;
}

export function renderProblems(
  problems: readonly Problem[],
  sources: ReadonlyMap<string, string>,
  options: RenderOptions,
): string {
  const paint = (style: Style, text: string): string =>
    options.color ? styleText(style, text, { validateStream: false }) : text;

  // A note is shown in full under the first error it explains, not repeated under each one.
  const shownNotes = new Set<string>();

  const blocks = problems.map((problem) => {
    const lines: string[] = [];
    const color: "red" | "yellow" = problem.severity === "error" ? "red" : "yellow";
    lines.push(
      `${paint(["bold", color], `${problem.severity}[${problem.code}]`)}${paint("bold", `: ${problem.message}`)}`,
    );

    const source = sources.get(problem.file);
    if (source !== undefined && problem.file !== "") {
      lines.push(...codeFrame(problem.file, source, problem.start, problem.end, color, paint, options.cwd));
    } else if (problem.file !== "") {
      lines.push(` ${paint(["bold", "blue"], "-->")} ${relative(options.cwd, problem.file)}`);
    }

    const gutter = " ".repeat(gutterWidth(source, problem.end));
    const equals = `${gutter} ${paint(["bold", "blue"], "=")}`;
    for (const detail of problem.details) {
      lines.push(`${equals} ${detail}`);
    }
    lines.push(...typeLines(problem.types ?? [], gutter, equals));
    for (const related of problem.related) {
      const relatedSource = isLibraryFile(related.file) ? undefined : sources.get(related.file);
      const path = displayPath(related.file, options.cwd);
      const where = relatedSource === undefined ? path : `${path}:${formatPosition(relatedSource, related.start)}`;
      lines.push(`${equals} ${paint("bold", "related")}: ${related.message} (${where})`);
    }

    const note = options.notes?.[problem.code] ?? problem.note ?? noteFor(problem.code);
    if (note !== undefined && !shownNotes.has(note)) {
      shownNotes.add(note);
      const [first = "", ...rest] = wrap(note, 76);
      lines.push(`${equals} ${paint(["bold", "cyan"], "help")}: ${first}`);
      for (const line of rest) lines.push(`${gutter}         ${line}`);
    }
    return lines.join("\n");
  });

  const errors = problems.filter((problem) => problem.severity === "error").length;
  const warnings = problems.length - errors;
  const summary: string[] = [];
  if (errors > 0) summary.push(paint(["bold", "red"], `${errors} error${errors === 1 ? "" : "s"}`));
  if (warnings > 0) summary.push(paint(["bold", "yellow"], `${warnings} warning${warnings === 1 ? "" : "s"}`));

  return `${blocks.join("\n\n")}\n\n${summary.join(", ")}\n`;
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
    `${blank}${paint(["bold", "blue"], "-->")} ${relative(cwd, file)}:${formatPosition(source, start)}`,
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
 * A path for the output. Library files get a short name, like
 * `lib.es2024.object.d.ts` or `@types/node/fs.d.ts`, instead of a long path
 * into tslings' own `node_modules`.
 */
function displayPath(file: string, cwd: string): string {
  const path = file.replaceAll("\\", "/");
  const index = path.lastIndexOf("/node_modules/");
  if (index === -1) return relative(cwd, file);
  return /^lib\..*\.d\.ts$/.test(basename(path)) ? basename(path) : path.slice(index + "/node_modules/".length);
}

/** Types longer than this are split into one union member per line. */
const MAX_TYPE_LINE = 100;

/**
 * `= expected: A` and `= found:    B`, aligned so they're easy to compare. A
 * long union gets one member per line.
 */
function typeLines(types: readonly ShownType[], gutter: string, equals: string): string[] {
  const width = Math.max(0, ...types.map((shown) => shown.label.length));
  const lines: string[] = [];
  for (const { label, type } of types) {
    const prefix = `${label}:${" ".repeat(width - label.length)} `;
    const members = splitUnion(type);
    if (gutter.length + 3 + prefix.length + type.length <= MAX_TYPE_LINE || members.length < 2) {
      lines.push(`${equals} ${prefix}${type}`);
      continue;
    }
    const [first = "", ...rest] = members;
    lines.push(`${equals} ${prefix}${first}`);
    const indent = " ".repeat(gutter.length + 3 + prefix.length);
    for (const member of rest) lines.push(`${indent}| ${member}`);
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

/** Wrap text to `width` columns, never inside a `code span`. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of words(paragraph)) {
      if (line.length > 0 && line.length + word.length + 1 > width) {
        lines.push(line);
        line = word;
      } else {
        line = line.length === 0 ? word : `${line} ${word}`;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Split on spaces, except the spaces inside `code spans`. */
function words(paragraph: string): string[] {
  const result: string[] = [];
  let word = "";
  let inCode = false;
  for (const char of paragraph) {
    if (char === "`") inCode = !inCode;
    if (char === " " && !inCode) {
      result.push(word);
      word = "";
    } else {
      word += char;
    }
  }
  result.push(word);
  return result;
}
