// The `no-unsafe-any` lint rule, the one rule that needs types.
//
// `no-explicit-any` catches `any` written in the code, but some APIs hand out
// `any` on their own: `JSON.parse` returns `any`, `new Map()` is a
// `Map<any, any>` and `Array.isArray` narrows to `any[]`. Such a value turns
// type checking off wherever it goes. This rule reports it where it spreads:
//
// - into a variable, field or parameter declared without a type annotation
//   (`const data = JSON.parse(text)`). With an annotation, the declared type is
//   what TypeScript checks from there on: `const data: unknown = JSON.parse(text)`
//   is the idiom tslings teaches.
// - into a `return`, an argument or an object property, unless that place is
//   typed `unknown` (or `any`, or `void`).
//
// The watch mode re-checks on every save, so the calls to the TypeScript
// process stay few: one for the types of all candidate expressions, then one
// per distinct generic type, per `any` value found and per finding.
import { SyntaxKind } from "typescript/unstable/ast";
import { isArrowFunction, isBindingElement, isBlock, isCallExpression, isIdentifier, isNewExpression, isParameterDeclaration, isPrivateIdentifier, isPropertyAccessExpression, isPropertyAssignment, isPropertyDeclaration, isReturnStatement, isSpreadElement, isVariableDeclaration, } from "typescript/unstable/ast/is";
import { TypeFlags } from "typescript/unstable/sync";
/** Generic types whose `any` type arguments spread like `any` itself. */
const CONTAINERS = new Set([
    "Array",
    "ReadonlyArray",
    "Map",
    "ReadonlyMap",
    "Set",
    "ReadonlySet",
    "WeakMap",
    "WeakSet",
    "Promise",
]);
/** Expressions that are never `any`: no need to ask TypeScript about them. */
const NEVER_ANY = new Set([
    SyntaxKind.StringLiteral,
    SyntaxKind.NumericLiteral,
    SyntaxKind.BigIntLiteral,
    SyntaxKind.NoSubstitutionTemplateLiteral,
    SyntaxKind.TemplateExpression,
    SyntaxKind.RegularExpressionLiteral,
    SyntaxKind.TrueKeyword,
    SyntaxKind.FalseKeyword,
    SyntaxKind.NullKeyword,
    SyntaxKind.ObjectLiteralExpression,
    SyntaxKind.ArrowFunction,
    SyntaxKind.FunctionExpression,
    SyntaxKind.ClassExpression,
    SyntaxKind.TypeOfExpression,
    SyntaxKind.VoidExpression,
    SyntaxKind.DeleteExpression,
]);
/** Find values of type `any` (or `Map<any, any>`, `any[]`...) that spread into the code. */
export function findUnsafeAny(sourceFile, checker) {
    const sinks = collectSinks(sourceFile);
    if (sinks.length === 0)
        return [];
    const types = checker.getTypeAtLocation(sinks.map((sink) => sink.expression));
    const anyTypes = new AnyTypes(checker);
    const findings = [];
    // Declarations already reported. Their uses are `any` too, but the declaration is the cause.
    const reported = new Set();
    sinks.forEach((sink, index) => {
        const type = types[index];
        const kind = type === undefined ? undefined : anyTypes.kind(type);
        if (type === undefined || kind === undefined)
            return;
        if (mentions(sink.expression, reported))
            return;
        if (sink.declares === undefined && anyTypes.isSafeTarget(sink.expression, type, kind))
            return;
        for (const name of sink.declares ?? [])
            reported.add(name);
        findings.push({
            start: sink.expression.getStart(sourceFile),
            end: sink.expression.end,
            type: kind === "any" ? "any" : checker.typeToString(type),
        });
    });
    return findings;
}
function collectSinks(sourceFile) {
    const sinks = [];
    const add = (expression, declares) => {
        if (expression === undefined || NEVER_ANY.has(expression.kind))
            return;
        sinks.push(declares === undefined ? { expression } : { expression, declares });
    };
    const visit = (node) => {
        if (isVariableDeclaration(node) || isParameterDeclaration(node)) {
            if (node.type === undefined)
                add(node.initializer, boundNames(node.name));
        }
        else if (isPropertyDeclaration(node)) {
            const field = memberName(node.name);
            if (node.type === undefined)
                add(node.initializer, field === undefined ? [] : [field]);
        }
        else if (isReturnStatement(node)) {
            add(node.expression);
        }
        else if (isArrowFunction(node) && !isBlock(node.body)) {
            add(node.body);
        }
        else if (isCallExpression(node) || isNewExpression(node)) {
            for (const argument of node.arguments ?? []) {
                if (!isSpreadElement(argument))
                    add(argument);
            }
        }
        else if (isPropertyAssignment(node)) {
            add(node.initializer);
        }
        node.forEachChild(visit);
    };
    sourceFile.forEachChild(visit);
    return sinks;
}
/** The names a declaration binds: `x` in `const x`, `a` and `b` in `const { a, b }`. */
function boundNames(name) {
    if (isIdentifier(name))
        return [name.text];
    const names = [];
    const visit = (node) => {
        if (isBindingElement(node) && node.name !== undefined && isIdentifier(node.name))
            names.push(node.name.text);
        node.forEachChild(visit);
    };
    name.forEachChild(visit);
    return names;
}
/**
 * Whether an expression uses one of the variables or fields (`this.#cache`) in
 * `names`: `raw.items[0]`, `stored > 0 ? stored : 16`. Scope-naive on purpose,
 * like prefer-const.
 */
function mentions(expression, names) {
    if (names.size === 0)
        return false;
    let found = false;
    const visit = (node) => {
        if (found)
            return;
        if (isIdentifier(node) && names.has(node.text))
            found = true;
        else if (isPropertyAccessExpression(node) && node.expression.kind === SyntaxKind.ThisKeyword) {
            const field = memberName(node.name);
            found = field !== undefined && names.has(field);
        }
        else
            node.forEachChild(visit);
    };
    visit(expression);
    return found;
}
/** `this.name` or `this.#name`: how fields are remembered once reported. */
function memberName(name) {
    return isIdentifier(name) || isPrivateIdentifier(name) ? `this.${name.text}` : undefined;
}
/** Asks TypeScript about types, and remembers the answers for one check. */
class AnyTypes {
    #checker;
    #containsAny = new Map();
    constructor(checker) {
        this.#checker = checker;
    }
    /** `any`, a container of `any` (`Map<any, any>`, `Promise<any[]>`...), or neither. */
    kind(type) {
        if (isAny(type))
            return "any";
        return this.#isContainerOfAny(type, 0) ? "container" : undefined;
    }
    #isContainerOfAny(type, depth) {
        if (depth > 2 || !type.isTypeReference())
            return false;
        const cached = this.#containsAny.get(type.id);
        if (cached !== undefined)
            return cached;
        const result = CONTAINERS.has(type.getSymbol()?.name ?? "") &&
            this.#checker
                .getTypeArguments(type)
                .some((argument) => isAny(argument) || this.#isContainerOfAny(argument, depth + 1));
        this.#containsAny.set(type.id, result);
        return result;
    }
    /** Whether the place a `return`, argument or property value goes keeps type checking on. */
    isSafeTarget(expression, type, kind) {
        const target = this.#checker.getContextualType(expression);
        if (target === undefined)
            return false;
        // `unknown` forces a check before use; `void` throws the value away.
        if (isUntyped(target) || (target.flags & TypeFlags.Void) !== 0)
            return true;
        if (kind === "any")
            return false;
        // `return new Map()` from a function that returns a `Map<string, number>`: an empty
        // collection takes the type it's given.
        if (isNewExpression(expression) && (expression.arguments ?? []).length === 0 && expression.typeArguments === undefined) {
            return true;
        }
        // `Promise<any>` into `Promise<unknown>`: each `any` argument meets an `unknown` one.
        if (!type.isTypeReference() || !target.isTypeReference() || target.getSymbol()?.name !== type.getSymbol()?.name) {
            return false;
        }
        const targetArguments = this.#checker.getTypeArguments(target);
        return this.#checker.getTypeArguments(type).every((argument, index) => {
            if (!isAny(argument) && !this.#isContainerOfAny(argument, 1))
                return true;
            const targetArgument = targetArguments[index];
            return targetArgument !== undefined && isUntyped(targetArgument);
        });
    }
}
/** `any`, but not the error type TypeScript uses after an error it already reports. */
function isAny(type) {
    return (type.flags & TypeFlags.Any) !== 0 && !type.isErrorType();
}
/** `unknown` or `any`: a place that doesn't promise anything about its value. */
function isUntyped(type) {
    return (type.flags & TypeFlags.AnyOrUnknown) !== 0;
}
