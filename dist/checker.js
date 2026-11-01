// Type-checks and lints exercise files with the TypeScript 7 API.
//
// One `Checker` keeps a TypeScript project open for the whole session. After
// the first check, re-checking a changed file only takes a few milliseconds,
// which is what keeps the watch mode responsive.
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { NodeFlags, SyntaxKind } from "typescript/unstable/ast";
import { isArrayLiteralExpression, isAsExpression, isBinaryExpression, isIdentifier, isObjectLiteralExpression, isParenthesizedExpression, isPostfixUnaryExpression, isPrefixUnaryExpression, isPropertyAssignment, isPropertyDeclaration, isShorthandPropertyAssignment, isSpreadAssignment, isSpreadElement, isTypeAssertion, isTypeReferenceNode, isVariableDeclaration, isVariableDeclarationList, } from "typescript/unstable/ast/is";
import { API, DiagnosticCategory, fileNameToDocumentURI } from "typescript/unstable/sync";
import { describeTypeTest, findTypeTests } from "./type-tests.js";
import { findUnsafeAny } from "./unsafe-any.js";
/** Lint rules that are always errors: they stop learners from silencing the type checker. */
export const CHEAT_RULES = [
    "no-explicit-any",
    "no-unsafe-any",
    "no-type-assertion",
    "no-non-null-assertion",
    "no-ts-comment",
];
/** Style rules: warnings by default, errors for exercises with `strict_lint = true` and for solutions. */
export const STYLE_RULES = ["no-var", "eqeqeq", "prefer-const"];
const RULE_MESSAGES = {
    "no-explicit-any": {
        message: "`any` is not allowed in tslings exercises",
        note: "`any` switches type checking off for this value, so the exercise would pass without teaching anything. Use a precise type, a generic, or `unknown` and narrow it.",
    },
    "no-unsafe-any": {
        message: "this value has type `any`, which switches type checking off",
        note: "Some APIs return `any` without you writing it: `JSON.parse`, `new Map()` without type arguments, `Array.isArray` (which narrows to `any[]`). Declare the value as `unknown` and narrow it (`const data: unknown = JSON.parse(text)`), or give the type arguments: `new Map<string, number>()`.",
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
/** `let total!: number` and `name!: string` in a class: the same rule as `value!`, another message. */
const DEFINITE_ASSIGNMENT = {
    message: "definite assignment assertions (`name!: Type`) are not allowed in tslings exercises",
    note: "`!` after a name tells TypeScript the variable or field is always assigned before it's read, without checking. Give it a value where it's declared or in the constructor, or add `| undefined` to its type and check it before use.",
};
/**
 * A file path the way the TypeScript API names files: absolute, with `/` separators.
 * On Windows, short 8.3 names (`C:\Users\RUNNER~1`) are expanded too, so that the
 * path matches the one TypeScript found when it listed the project's files.
 */
export function typeScriptPath(file) {
    const absolute = resolve(file);
    if (sep === "/")
        return absolute;
    let long = absolute;
    try {
        long = realpathSync.native(absolute);
    }
    catch {
        // The file doesn't exist yet: keep the path as given.
    }
    return long.replaceAll("\\", "/");
}
/** A file as a `file://` URI, the form the TypeScript server compares file changes in on every system. */
function documentOf(file) {
    return { uri: fileNameToDocumentURI(typeScriptPath(file)) };
}
export class Checker {
    #api;
    #configPath;
    #project;
    /** @param configPath The tsconfig.json that includes every exercise and solution file. */
    constructor(configPath) {
        this.#configPath = typeScriptPath(configPath);
        this.#api = new API({ cwd: typeScriptPath(resolve(configPath, "..")) });
        this.#project = this.#openProject({ openProjects: [this.#configPath] });
    }
    #openProject(params) {
        const project = this.#api.updateSnapshot(params).getProject(this.#configPath);
        if (project === undefined) {
            throw new Error(`TypeScript could not load the project ${this.#configPath}`);
        }
        return project;
    }
    /** Tell the checker that files changed on disk. Pass nothing to drop every cached file. */
    invalidate(files) {
        this.#project = this.#openProject({
            fileChanges: files === undefined ? { invalidateAll: true } : { changed: files.map(documentOf) },
        });
    }
    /** Type-check and lint one file. The file and its extra files are re-read from disk. */
    check(file, options = {}) {
        const path = typeScriptPath(file);
        this.invalidate([path, ...(options.extraFiles ?? [])]);
        if (this.#project.program.getSourceFile(path) === undefined) {
            // A file created after the project was opened (e.g. a new solution file).
            this.#project = this.#openProject({ fileChanges: { created: [documentOf(path)] } });
        }
        const program = this.#project.program;
        // TS18003 "No inputs were found" is stale once a file is created after the project was opened.
        const configDiagnostics = program.getConfigFileParsingDiagnostics().filter((diagnostic) => diagnostic.code !== 18003);
        const syntactic = program.getSyntacticDiagnostics(path);
        const semantic = syntactic.length > 0 ? [] : program.getSemanticDiagnostics(path);
        const sourceFile = program.getSourceFile(path);
        if (sourceFile === undefined) {
            throw new Error(`The file ${path} is not part of the TypeScript project ${this.#configPath}`);
        }
        const typeChecker = this.#project.checker;
        const problems = [...configDiagnostics, ...syntactic].map(toProblem);
        problems.push(...withTypeTests(semantic.map(toProblem), sourceFile, typeChecker));
        if (syntactic.length === 0) {
            // Type errors make `any` appear on their own (a parameter without a type is `any`):
            // the type-aware rule waits until they're fixed.
            const typeErrors = semantic.some((diagnostic) => diagnostic.category === DiagnosticCategory.Error);
            problems.push(...lint(sourceFile, path, options, typeErrors ? undefined : typeChecker));
        }
        return { problems, ok: problems.every((problem) => problem.severity !== "error") };
    }
    close() {
        this.#api.close();
    }
}
function toProblem(diagnostic) {
    return {
        source: "typescript",
        code: `TS${diagnostic.code}`,
        severity: diagnostic.category === DiagnosticCategory.Error ? "error" : "warning",
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
/** Most failing type tests on one file that get their types printed. Each takes a few calls to TypeScript. */
const MAX_DESCRIBED_TYPE_TESTS = 20;
/** Add both types to failing `Expect<Equal<A, B>>` checks (TS2344 on the `Equal<A, B>`). */
function withTypeTests(problems, sourceFile, checker) {
    if (!problems.some((problem) => problem.code === "TS2344"))
        return [...problems];
    const tests = findTypeTests(sourceFile);
    let described = 0;
    return problems.map((problem) => {
        const test = problem.code === "TS2344" ? tests.get(problem.start) : undefined;
        if (test === undefined || test.end !== problem.end || described >= MAX_DESCRIBED_TYPE_TESTS)
            return problem;
        described++;
        const { types, note } = describeTypeTest(test, checker);
        return { ...problem, types, ...(note === undefined ? {} : { typeNote: note }) };
    });
}
function flattenChain(chain, depth = 0) {
    return chain.flatMap((link) => [
        `${"  ".repeat(depth)}${link.text}`,
        ...flattenChain(link.messageChain ?? [], depth + 1),
    ]);
}
/** Lint one file. The type-aware rule only runs when `typeChecker` is given. */
function lint(sourceFile, file, options, typeChecker) {
    const allowed = new Set(options.allowLints ?? []);
    const problems = [];
    const report = (rule, start, end, text = RULE_MESSAGES[rule]) => {
        if (allowed.has(rule))
            return;
        const isCheat = CHEAT_RULES.includes(rule);
        problems.push({
            source: "lint",
            code: rule,
            severity: isCheat || options.strictLint === true ? "error" : "warning",
            message: text.message,
            note: text.note,
            details: [],
            file,
            start,
            end,
            related: [],
        });
    };
    // For prefer-const: `let` bindings with an initializer, and every name assigned anywhere.
    // Scope-naive on purpose: a name assigned anywhere in the file is never reported.
    const letBindings = [];
    const assignedNames = new Set();
    const collectAssigned = (target) => {
        if (isIdentifier(target))
            assignedNames.add(target.text);
        else if (isParenthesizedExpression(target))
            collectAssigned(target.expression);
        else if (isArrayLiteralExpression(target))
            target.elements.forEach(collectAssigned);
        else if (isSpreadElement(target))
            collectAssigned(target.expression);
        else if (isObjectLiteralExpression(target)) {
            for (const property of target.properties) {
                if (isShorthandPropertyAssignment(property))
                    collectAssigned(property.name);
                else if (isPropertyAssignment(property))
                    collectAssigned(property.initializer);
                else if (isSpreadAssignment(property))
                    collectAssigned(property.expression);
            }
        }
        else if (isBinaryExpression(target) && target.operatorToken.kind === SyntaxKind.EqualsToken) {
            collectAssigned(target.left); // destructuring default: `[a = 1] = xs`
        }
    };
    const visit = (node) => {
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
            case SyntaxKind.VariableDeclaration:
                if (isVariableDeclaration(node) && node.exclamationToken !== undefined) {
                    report("no-non-null-assertion", node.name.getStart(sourceFile), node.exclamationToken.end, DEFINITE_ASSIGNMENT);
                }
                break;
            case SyntaxKind.PropertyDeclaration:
                if (isPropertyDeclaration(node) && node.postfixToken?.kind === SyntaxKind.ExclamationToken) {
                    report("no-non-null-assertion", node.name.getStart(sourceFile), node.postfixToken.end, DEFINITE_ASSIGNMENT);
                }
                break;
            case SyntaxKind.VariableDeclarationList: {
                const text = sourceFile.text.slice(node.getStart(sourceFile), node.end);
                // `declare global { var x: T }` is how globals are typed: `var` is the only way there.
                if (/^var\b/.test(text) && (node.flags & NodeFlags.Ambient) === 0) {
                    report("no-var", node.getStart(sourceFile), node.getStart(sourceFile) + 3);
                }
                if (/^let\b/.test(text) && isVariableDeclarationList(node)) {
                    const inForInOrOf = node.parent.kind === SyntaxKind.ForOfStatement || node.parent.kind === SyntaxKind.ForInStatement;
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
                if ((isPrefixUnaryExpression(node) || isPostfixUnaryExpression(node)) &&
                    (node.operator === SyntaxKind.PlusPlusToken || node.operator === SyntaxKind.MinusMinusToken)) {
                    collectAssigned(node.operand);
                }
                break;
            }
            case SyntaxKind.BinaryExpression: {
                if (!isBinaryExpression(node))
                    break;
                const { operatorToken, right, left } = node;
                if (operatorToken.kind >= SyntaxKind.FirstAssignment &&
                    operatorToken.kind <= SyntaxKind.LastAssignment) {
                    collectAssigned(left);
                }
                const looseOperator = operatorToken.kind === SyntaxKind.EqualsEqualsToken ||
                    operatorToken.kind === SyntaxKind.ExclamationEqualsToken;
                const comparesWithNull = right.kind === SyntaxKind.NullKeyword || left.kind === SyntaxKind.NullKeyword;
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
    if (typeChecker !== undefined && !allowed.has("no-unsafe-any")) {
        for (const finding of findUnsafeAny(sourceFile, typeChecker)) {
            report("no-unsafe-any", finding.start, finding.end, {
                ...RULE_MESSAGES["no-unsafe-any"],
                message: `this value has type \`${finding.type}\`, which switches type checking off`,
            });
        }
    }
    // Report in source order, like TypeScript.
    return problems.sort((a, b) => a.start - b.start);
}
/** `x as const` and `<const>x` are the one kind of assertion tslings allows. */
function isConstType(type, sourceFile) {
    return (isTypeReferenceNode(type) && sourceFile.text.slice(type.getStart(sourceFile), type.end) === "const");
}
/** Rough check that a `//` or `/*` match is a real comment and not inside a string. */
function isInsideComment(sourceFile, index) {
    const lineStart = sourceFile.text.lastIndexOf("\n", index) + 1;
    const before = sourceFile.text.slice(lineStart, index);
    const quotes = (before.match(/["'`]/g) ?? []).length;
    return quotes % 2 === 0;
}
/** Read a file the way TypeScript sees it, for rendering code frames. */
export function readSource(file) {
    return readFileSync(file, "utf8");
}
