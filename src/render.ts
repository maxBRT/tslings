// Renders problems the way rustc does: a header with the error code, the
// location, a code frame with carets under the faulty span, then notes.
//
//   error[TS2322]: Type 'string' is not assignable to type 'number'.
//    --> exercises/01_variables/variables2.ts:7:7
//     |
//   7 | const count: number = "three";
//     |       ^^^^^
//     = note: ...

import { relative } from "node:path";
import { styleText } from "node:util";
import type { Problem } from "./checker.ts";
import { noteFor } from "./notes.ts";

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
    for (const detail of problem.details) {
      lines.push(`${gutter} ${paint(["bold", "blue"], "=")} ${detail}`);
    }
    for (const related of problem.related) {
      const relatedSource = sources.get(related.file);
      const where =
        relatedSource === undefined
          ? relative(options.cwd, related.file)
          : `${relative(options.cwd, related.file)}:${formatPosition(relatedSource, related.start)}`;
      lines.push(`${gutter} ${paint(["bold", "blue"], "=")} ${paint("bold", "related")}: ${related.message} (${where})`);
    }

    const note = options.notes?.[problem.code] ?? problem.note ?? noteFor(problem.code);
    if (note !== undefined) {
      const [first = "", ...rest] = wrap(note, 76);
      lines.push(`${gutter} ${paint(["bold", "blue"], "=")} ${paint(["bold", "cyan"], "help")}: ${first}`);
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

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
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
