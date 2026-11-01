// Type-checks and lints exercise files with the TypeScript 7 API.
//
// One `Checker` keeps a TypeScript project open for the whole session. After
// the first check, re-checking a changed file only takes a few milliseconds,
// which is what keeps the watch mode responsive.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SyntaxKind } from "typescript/unstable/ast";
import type { Node, SourceFile } from "typescript/unstable/ast";
import {
  isArrayLiteralExpression,
  isAsExpression,
  isBinaryExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPostfixUnaryExpression,
  isPrefixUnaryExpression,
  isPropertyAssignment,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  isSpreadElement,
  isTypeAssertion,
  isTypeReferenceNode,
  isVariableDeclarationList,
} from "typescript/unstable/ast/is";
import { API } from "typescript/unstable/sync";
import type { Diagnostic, Project } from "typescript/unstable/sync";

/** A problem found in an exercise: a type error or a tslings lint. */
export interface Problem {
  readonly source: "typescript" | "lint";
  /** `TS2322` for type errors, the rule name for lints. */
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  /** Extra lines from TypeScript's message chain. */
  readonly details: readonly string[];
  /** Explanation shown below the message, written for learners. */
  readonly note?: string;
  readonly file: string;
  readonly start: number;
  readonly end: number;
  readonly related: readonly RelatedInfo[];
}

export interface RelatedInfo {
  readonly message: string;
  readonly file: string;
  readonly start: number;
  readonly end: number;
}

/** Lint rules that are always errors: they stop learners from silencing the type checker. */
export const CHEAT_RULES = [
  "no-explicit-any",
  "no-type-assertion",
  "no-non-null-assertion",
  "no-ts-comment",
] as const;

/** Style rules: warnings by default, errors for exercises with `strict_lint = true` and for solutions. */
export const STYLE_RULES = ["no-var", "eqeqeq", "prefer-const"] as const;

export type LintRule = (typeof CHEAT_RULES)[number] | (typeof STYLE_RULES)[number];

export interface CheckOptions {
  /** Lint rules the exercise is allowed to break (e.g. `no-ts-comment` in a chapter about `@ts-expect-error`). */
  readonly allowLints?: readonly string[];
  /** Turn style warnings into errors. */
  readonly strictLint?: boolean;
}

export interface CheckResult {
  readonly problems: readonly Problem[];
  /** False when at least one problem is an error. */
  readonly ok: boolean;
}

const RULE_MESSAGES: Record<LintRule, { message: string; note: string }> = {
  "no-explicit-any": {
    message: "`any` is not allowed in tslings exercises",
    note: "`any` switches type checking off for this value, so the exercise would pass without teaching anything. Use a precise type, a generic, or `unknown` and narrow it.",
  },
  "no-type-assertion": {
    message: "type assertions (`as T`) are not allowed in tslings exercises",
    note: "An assertion tells TypeScript to trust you instead of checking. Find a way for TypeScript to prove the type: narrowing, a type guard, a better annotation, or `satisfies`. (`as const` is fine.)",
  },
  "no-non-null-assertion": {
    message: "non-null assertions (`value!`) are not allowed in tslings exercises",
    note: "`!` hides a possible `null` or `undefined` instead of handling it. Check the value first, or use `?.` and `??`.",
  },
  "no-ts-comment": {
    message: "`@ts-` directive comments are not allowed in tslings exercises",
    note: "`@ts-ignore`, `@ts-expect-error` and `@ts-nocheck` hide errors instead of fixing them. Remove the comment and fix the error it hides.",
  },
  "no-var": {
    message: "use `let` or `const` instead of `var`",
    note: "`var` is function-scoped and hoisted, which causes surprising bugs. `const` is the default; use `let` only when you reassign.",
  },
  "prefer-const": {
    message: "this `let` is never reassigned, use `const`",
    note: "`const` tells the reader (and TypeScript) that the binding never changes. TypeScript also infers narrower types for `const`: `const mode = \"dark\"` has type `\"dark\"`, not `string`.",
  },
  eqeqeq: {
    message: "use `===` and `!==` instead of `==` and `!=`",
    note: "`==` converts types before comparing (`0 == \"\"` is true). The only common exception, `x == null`, is allowed because it checks for both `null` and `undefined`.",
  },
};

export class Checker {
  readonly #api: API;
  readonly #configPath: string;
  #project: Project;

  /** @param configPath The tsconfig.json that includes every exercise and solution file. */
  constructor(configPath: string) {
    this.#configPath = resolve(configPath);
    this.#api = new API({ cwd: resolve(configPath, "..") });
    this.#project = this.#openProject({ openProjects: [this.#configPath] });
  }

  #openProject(params: Parameters<API["updateSnapshot"]>[0]): Project {
    const project = this.#api.updateSnapshot(params).getProject(this.#configPath);
    if (project === undefined) {
      throw new Error(`TypeScript could not load the project ${this.#configPath}`);
    }
    return project;
  }

  /** Tell the checker that files changed on disk. Pass nothing to drop every cached file. */
  invalidate(files?: readonly string[]): void {
    this.#project = this.#openProject({
      fileChanges:
        files === undefined ? { invalidateAll: true } : { changed: files.map((file) => resolve(file)) },
    });
  }

  /** Type-check and lint one file. The file is re-read from disk. */
  check(file: string, options: CheckOptions = {}): CheckResult {
    const path = resolve(file);
    this.invalidate([path]);
    if (this.#project.program.getSourceFile(path) === undefined) {
      // A file created after the project was opened (e.g. a new solution file).
      this.#project = this.#openProject({ fileChanges: { created: [path] } });
    }
    const program = this.#project.program;

    const configDiagnostics = program.getConfigFileParsingDiagnostics();
    const syntactic = program.getSyntacticDiagnostics(path);
    const semantic = syntactic.length > 0 ? [] : program.getSemanticDiagnostics(path);
    const problems: Problem[] = [...configDiagnostics, ...syntactic, ...semantic].map(toProblem);

    const sourceFile = program.getSourceFile(path);
    if (sourceFile === undefined) {
      throw new Error(`The file ${path} is not part of the TypeScript project ${this.#configPath}`);
    }
    if (syntactic.length === 0) {
      problems.push(...lint(sourceFile, path, options));
    }

    return { problems, ok: problems.every((problem) => problem.severity !== "error") };
  }

  close(): void {
    this.#api.close();
  }
}

function toProblem(diagnostic: Diagnostic): Problem {
  return {
    source: "typescript",
    code: `TS${diagnostic.code}`,
    severity: diagnostic.category === 1 ? "error" : "warning",
    message: diagnostic.text,
    details: flattenChain(diagnostic.messageChain ?? []),
    file: diagnostic.fileName ?? "",
    start: diagnostic.pos,
    end: diagnostic.end,
    related: (diagnostic.relatedInformation ?? []).map((info) => ({
      message: info.text,
      file: info.fileName ?? "",
      start: info.pos,
      end: info.end,
    })),
  };
}

function flattenChain(chain: readonly Diagnostic[], depth = 0): string[] {
  return chain.flatMap((link) => [
    `${"  ".repeat(depth)}${link.text}`,
    ...flattenChain(link.messageChain ?? [], depth + 1),
  ]);
}

function lint(sourceFile: SourceFile, file: string, options: CheckOptions): Problem[] {
  const allowed = new Set(options.allowLints ?? []);
  const problems: Problem[] = [];

  const report = (rule: LintRule, start: number, end: number): void => {
    if (allowed.has(rule)) return;
    const isCheat = (CHEAT_RULES as readonly string[]).includes(rule);
    problems.push({
      source: "lint",
      code: rule,
      severity: isCheat || options.strictLint === true ? "error" : "warning",
      message: RULE_MESSAGES[rule].message,
      note: RULE_MESSAGES[rule].note,
      details: [],
      file,
      start,
      end,
      related: [],
    });
  };

  // For prefer-const: `let` bindings with an initializer, and every name assigned anywhere.
  // Scope-naive on purpose: a name assigned anywhere in the file is never reported.
  const letBindings: Node[] = [];
  const assignedNames = new Set<string>();
  const collectAssigned = (target: Node): void => {
    if (isIdentifier(target)) assignedNames.add(target.text);
    else if (isParenthesizedExpression(target)) collectAssigned(target.expression);
    else if (isArrayLiteralExpression(target)) target.elements.forEach(collectAssigned);
    else if (isSpreadElement(target)) collectAssigned(target.expression);
    else if (isObjectLiteralExpression(target)) {
      for (const property of target.properties) {
        if (isShorthandPropertyAssignment(property)) collectAssigned(property.name);
        else if (isPropertyAssignment(property)) collectAssigned(property.initializer);
        else if (isSpreadAssignment(property)) collectAssigned(property.expression);
      }
    } else if (isBinaryExpression(target) && target.operatorToken.kind === SyntaxKind.EqualsToken) {
      collectAssigned(target.left); // destructuring default: `[a = 1] = xs`
    }
  };

  const visit = (node: Node): void => {
    switch (node.kind) {
      case SyntaxKind.AnyKeyword:
        report("no-explicit-any", node.getStart(sourceFile), node.end);
        break;
      case SyntaxKind.AsExpression:
      case SyntaxKind.TypeAssertionExpression: {
        if ((isAsExpression(node) || isTypeAssertion(node)) && !isConstType(node.type, sourceFile)) {
          report("no-type-assertion", node.getStart(sourceFile), node.end);
        }
        break;
      }
      case SyntaxKind.NonNullExpression:
        report("no-non-null-assertion", node.getStart(sourceFile), node.end);
        break;
      case SyntaxKind.VariableDeclarationList: {
        const text = sourceFile.text.slice(node.getStart(sourceFile), node.end);
        if (/^var\b/.test(text)) {
          report("no-var", node.getStart(sourceFile), node.getStart(sourceFile) + 3);
        }
        if (/^let\b/.test(text) && isVariableDeclarationList(node)) {
          const inForInOrOf =
            node.parent.kind === SyntaxKind.ForOfStatement || node.parent.kind === SyntaxKind.ForInStatement;
          for (const declaration of node.declarations) {
            if ((declaration.initializer !== undefined || inForInOrOf) && isIdentifier(declaration.name)) {
              letBindings.push(declaration.name);
            }
          }
        }
        break;
      }
      case SyntaxKind.PrefixUnaryExpression:
      case SyntaxKind.PostfixUnaryExpression: {
        if (
          (isPrefixUnaryExpression(node) || isPostfixUnaryExpression(node)) &&
          (node.operator === SyntaxKind.PlusPlusToken || node.operator === SyntaxKind.MinusMinusToken)
        ) {
          collectAssigned(node.operand);
        }
        break;
      }
      case SyntaxKind.BinaryExpression: {
        if (!isBinaryExpression(node)) break;
        const { operatorToken, right, left } = node;
        if (
          operatorToken.kind >= SyntaxKind.FirstAssignment &&
          operatorToken.kind <= SyntaxKind.LastAssignment
        ) {
          collectAssigned(left);
        }
        const looseOperator =
          operatorToken.kind === SyntaxKind.EqualsEqualsToken ||
          operatorToken.kind === SyntaxKind.ExclamationEqualsToken;
        const comparesWithNull =
          right.kind === SyntaxKind.NullKeyword || left.kind === SyntaxKind.NullKeyword;
        if (looseOperator && !comparesWithNull) {
          report("eqeqeq", operatorToken.getStart(sourceFile), operatorToken.end);
        }
        break;
      }
    }
    node.forEachChild(visit);
  };
  sourceFile.forEachChild(visit);

  for (const name of letBindings) {
    if (isIdentifier(name) && !assignedNames.has(name.text)) {
      report("prefer-const", name.getStart(sourceFile), name.end);
    }
  }

  for (const match of sourceFile.text.matchAll(/(\/\/|\/\*)\s*@ts-(ignore|nocheck|expect-error)\b/g)) {
    if (isInsideComment(sourceFile, match.index)) {
      report("no-ts-comment", match.index, match.index + match[0].length);
    }
  }

  return problems;
}

/** `x as const` and `<const>x` are the one kind of assertion tslings allows. */
function isConstType(type: Node, sourceFile: SourceFile): boolean {
  return (
    isTypeReferenceNode(type) && sourceFile.text.slice(type.getStart(sourceFile), type.end) === "const"
  );
}

/** Rough check that a `//` or `/*` match is a real comment and not inside a string. */
function isInsideComment(sourceFile: SourceFile, index: number): boolean {
  const lineStart = sourceFile.text.lastIndexOf("\n", index) + 1;
  const before = sourceFile.text.slice(lineStart, index);
  const quotes = (before.match(/["'`]/g) ?? []).length;
  return quotes % 2 === 0;
}

/** Read a file the way TypeScript sees it, for rendering code frames. */
export function readSource(file: string): string {
  return readFileSync(file, "utf8");
}
