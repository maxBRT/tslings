// Failing type tests. When `Expect<Equal<A, B>>` fails, TypeScript only says
// "Type 'false' does not satisfy the constraint 'true'". The learner needs to
// see both types the way TypeScript sees them, like rustc's "expected X,
// found Y". Exercises write the type under test first and the expected type
// second: `Expect<Equal<typeof result, Result<User>>>`.
//
// Both sides are printed the same way, so that they can be compared: a named
// object type (an interface, or an alias like `type Product = {...}`) shows its
// members, one level deep, wherever it is at the top (alone, or in a union or
// an intersection). TypeScript alone would print `Product` on one side and
// `{ id: string; ... }` on the other.

import { SyntaxKind } from "typescript/unstable/ast";
import type { Node, SourceFile, TypeNode, TypeReferenceNode } from "typescript/unstable/ast";
import { isIdentifier, isQualifiedName, isTypeReferenceNode } from "typescript/unstable/ast/is";
import { isTupleType, NodeBuilderFlags, ObjectFlags, SignatureKind, SymbolFlags, TypeFlags } from "typescript/unstable/sync";
import type { Checker, ObjectType, Symbol as TypeSymbol, Type } from "typescript/unstable/sync";

/** A type shown below an error: `= expected: { ok: true }`. */
export interface ShownType {
  readonly label: string;
  readonly type: string;
}

export interface TypeTestDescription {
  readonly types: ShownType[];
  /** What tells the two types apart, when it's hard to see in their printed form. */
  readonly note?: string;
}

/** The `Equal<A, B>` and `NotEqual<A, B>` checks wrapped in `Expect<...>`, by start position. */
export function findTypeTests(sourceFile: SourceFile): Map<number, TypeReferenceNode> {
  const tests = new Map<number, TypeReferenceNode>();
  const visit = (node: Node): void => {
    if (
      isTypeReferenceNode(node) &&
      (referenceName(node) === "Equal" || referenceName(node) === "NotEqual") &&
      isTypeReferenceNode(node.parent) &&
      referenceName(node.parent) === "Expect"
    ) {
      tests.set(node.getStart(sourceFile), node);
    }
    node.forEachChild(visit);
  };
  sourceFile.forEachChild(visit);
  return tests;
}

/** Both sides of a failing type test, printed the same way. */
export function describeTypeTest(test: TypeReferenceNode, checker: Checker): TypeTestDescription {
  const [found, expected] = test.typeArguments ?? [];
  if (found === undefined || expected === undefined) return { types: [] };
  const [foundType, expectedType] = checker.getTypeAtLocation([found, expected]);
  const printer = new TypePrinter(checker, test);
  const foundText = foundType === undefined ? sourceText(found) : printer.print(foundType);
  // `NotEqual` fails when both sides are the same type.
  if (referenceName(test) === "NotEqual") return { types: [{ label: "both types are", type: foundText }] };
  const expectedText = expectedType === undefined ? sourceText(expected) : printer.print(expectedType);
  const types = [
    { label: "expected", type: expectedText },
    { label: "found", type: foundText },
  ];
  const note =
    foundType === undefined || expectedType === undefined
      ? undefined
      : differenceNote(checker, foundType, expectedType, foundText, expectedText);
  return note === undefined ? { types } : { types, note };
}

/** Without types, the source text is the next best thing. */
function sourceText(node: TypeNode): string {
  return node.getText().replace(/\s+/g, " ").trim();
}

/** Longer than this, a type is printed the way TypeScript shortens it (`... 12 more ...`). */
const MAX_TYPE_LENGTH = 1000;

/** `CheckFlags.Readonly`: a property made `readonly` by a mapped type like `Readonly<T>`. */
const READONLY_CHECK_FLAG = 8;

class TypePrinter {
  readonly #checker: Checker;
  readonly #location: Node;
  readonly #undefinedId: number;

  constructor(checker: Checker, location: Node) {
    this.#checker = checker;
    this.#location = location;
    this.#undefinedId = checker.getUndefinedType().id;
  }

  /**
   * The type with its named object types expanded at the top level. Expanded,
   * a big type (an interface with hundreds of properties, a long union of
   * them) gets much longer than TypeScript prints it: it's then left to
   * TypeScript, which shortens it.
   */
  print(type: Type): string {
    const expanded = this.#expanded(type);
    return expanded.length <= MAX_TYPE_LENGTH ? expanded : this.#typeToString(type, NodeBuilderFlags.InTypeAlias);
  }

  #expanded(type: Type): string {
    if (type.isUnionType()) {
      const members = type.getTypes();
      // An enum's members are shown by the enum's name.
      if (members.some((member) => (member.flags & TypeFlags.EnumLiteral) !== 0)) {
        return this.#typeToString(type, NodeBuilderFlags.InTypeAlias);
      }
      return this.#union(members);
    }
    if (type.isIntersectionType()) {
      return type
        .getTypes()
        .map((member) => parenthesize(this.#member(member), " & "))
        .join(" & ");
    }
    return this.#member(type);
  }

  /** Like TypeScript: `null` and `undefined` last, `true | false` as `boolean`. */
  #union(members: readonly Type[]): string {
    const parts: string[] = [];
    const nullish: string[] = [];
    const booleans = members.filter((member) => (member.flags & TypeFlags.BooleanLiteral) !== 0);
    let booleanShown = false;
    for (const member of members) {
      if ((member.flags & TypeFlags.Null) !== 0) nullish.unshift("null");
      else if ((member.flags & TypeFlags.Undefined) !== 0) nullish.push("undefined");
      else if (booleans.length === 2 && booleans.includes(member)) {
        if (!booleanShown) parts.push("boolean");
        booleanShown = true;
      } else parts.push(parenthesize(this.#member(member), " | "));
    }
    return [...parts, ...nullish].join(" | ");
  }

  #member(type: Type): string {
    const expanded = this.#isExpandable(type) ? this.#members(type) : undefined;
    return expanded ?? this.#typeToString(type, NodeBuilderFlags.InTypeAlias);
  }

  /** Object types that TypeScript may show by name: interfaces, aliases, mapped types like `Readonly<T>`. */
  #isExpandable(type: Type): type is ObjectType {
    if (!type.isObjectType()) return false;
    const symbol = type.getSymbol();
    // Classes keep their name, and so do the interfaces of the standard library or of packages (`Date`, `Map`).
    if ((type.objectFlags & ObjectFlags.Class) !== 0 || (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0)) {
      return false;
    }
    const named =
      (type.objectFlags & ObjectFlags.ClassOrInterface) !== 0 ||
      (symbol !== undefined && (symbol.flags & SymbolFlags.Interface) !== 0);
    if (named && symbol !== undefined && symbol.declarations.every((declaration) => isLibraryPath(declaration.path))) {
      return false;
    }
    if (!named && (type.objectFlags & (ObjectFlags.Anonymous | ObjectFlags.Mapped)) === 0) return false;
    // Functions, constructors and tuples read better the way TypeScript prints them.
    if (this.#checker.getSignaturesOfType(type, SignatureKind.Call).length > 0) return false;
    if (this.#checker.getSignaturesOfType(type, SignatureKind.Construct).length > 0) return false;
    return !isTupleType(type);
  }

  /** `{ readonly id: string; name?: string; }`, with the members' types as TypeScript prints them. */
  #members(type: ObjectType): string | undefined {
    const properties = this.#checker.getPropertiesOfType(type);
    // Symbol keys (`[Symbol.iterator]`) are left to TypeScript.
    if (properties.some((property) => property.name.startsWith("__@"))) return undefined;
    const indexInfos = this.#checker.getIndexInfosOfType(type);
    if (properties.length === 0 && indexInfos.length === 0) {
      // An empty interface is `{}`. A generic mapped type has no members yet: TypeScript shows its definition.
      return (type.objectFlags & ObjectFlags.Mapped) !== 0 ? undefined : "{}";
    }
    const members: string[] = indexInfos.map(
      (info) =>
        `${info.isReadonly ? "readonly " : ""}[x: ${this.#typeToString(info.keyType)}]: ${this.#typeToString(info.valueType)};`,
    );
    const propertyTypes = properties.length === 0 ? [] : this.#checker.getTypeOfSymbol(properties);
    let length = 0;
    for (const [index, property] of properties.entries()) {
      const propertyType = propertyTypes[index];
      if (propertyType === undefined) continue;
      const optional = (property.flags & SymbolFlags.Optional) !== 0;
      let text = this.#typeToString(propertyType);
      if (optional && this.#hasMissingType(propertyType)) text = withoutUndefined(text);
      const modifier = this.#isReadonly(property) ? "readonly " : "";
      const member = `${modifier}${propertyName(property.name)}${optional ? "?" : ""}: ${text};`;
      // Too long to read: TypeScript shows it by name, or shortened.
      length += member.length + 1;
      if (length > MAX_TYPE_LENGTH) return undefined;
      members.push(member);
    }
    return `{ ${members.join(" ")} }`;
  }

  /**
   * With `exactOptionalPropertyTypes`, the type of `name?: string` is `string`
   * plus a "missing" type that TypeScript prints as `undefined`, unlike
   * `name?: string | undefined`, whose `undefined` is the real one.
   */
  #hasMissingType(type: Type): boolean {
    const members = type.isUnionType() ? type.getTypes() : [type];
    return members.some((member) => (member.flags & TypeFlags.Undefined) !== 0 && member.id !== this.#undefinedId);
  }

  #isReadonly(property: TypeSymbol): boolean {
    if ((property.checkFlags & READONLY_CHECK_FLAG) !== 0) return true;
    return property.declarations.some((handle) => {
      if (handle.kind !== SyntaxKind.PropertySignature && handle.kind !== SyntaxKind.PropertyDeclaration) return false;
      const declaration = handle.resolve();
      const modifiers: unknown = declaration !== undefined && "modifiers" in declaration ? declaration.modifiers : undefined;
      return Array.isArray(modifiers) && modifiers.some((modifier: { kind?: unknown }) => modifier.kind === SyntaxKind.ReadonlyKeyword);
    });
  }

  #typeToString(type: Type, flags: number = NodeBuilderFlags.None): string {
    // A shortened type (`... 3 more ...`) can hide the difference: print it in full, unless it's huge.
    const full = this.#checker.typeToString(type, this.#location, flags | NodeBuilderFlags.NoTruncation);
    return full.length <= MAX_TYPE_LENGTH ? full : this.#checker.typeToString(type, this.#location, flags);
  }
}

/** Parentheses around a function type in a union, or around a union in an intersection. */
function parenthesize(text: string, separator: " | " | " & "): string {
  const needed =
    hasTopLevel(text, " => ") || hasTopLevel(text, " extends ") || (separator === " & " && hasTopLevel(text, " | "));
  return needed ? `(${text})` : text;
}

/** Whether `needle` appears in `text` outside brackets and string literals. */
function hasTopLevel(text: string, needle: string): boolean {
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    if (quote !== undefined) {
      if (char === "\\") index++;
      else if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if ("([{<".includes(char)) depth++;
    else if (")]}".includes(char) || (char === ">" && text.charAt(index - 1) !== "=")) depth--;
    else if (depth === 0 && text.startsWith(needle, index)) return true;
  }
  return false;
}

/** `string | undefined` → `string`, `(() => void) | undefined` → `() => void`. */
function withoutUndefined(text: string): string {
  if (!text.endsWith(" | undefined")) return text;
  const rest = text.slice(0, -" | undefined".length);
  return rest.startsWith("(") && closingParen(rest) === rest.length - 1 ? rest.slice(1, -1) : rest;
}

/** The index of the parenthesis that closes the one at index 0. */
function closingParen(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === "(") depth++;
    else if (text[index] === ")" && --depth === 0) return index;
  }
  return -1;
}

function propertyName(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) || /^\d+$/.test(name) ? name : JSON.stringify(name);
}

/** TypeScript's standard library (`lib.es5.d.ts`) and npm packages. */
function isLibraryPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return normalized.includes("/node_modules/") || /(^|\/)lib\.[^/]*\.d\.ts$/.test(normalized);
}

/**
 * A hint for when the printed types don't show the difference well: they
 * print the same, they only differ in modifiers, or one side is an
 * intersection and the other isn't.
 */
function differenceNote(checker: Checker, found: Type, expected: Type, foundText: string, expectedText: string): string | undefined {
  const isIntersection = (type: Type): boolean => type.isIntersectionType();
  if (isIntersection(found) !== isIntersection(expected) && sameProperties(checker, found, expected)) {
    return isIntersection(expected)
      ? "`expected` is an intersection (`A & B`), `found` one object type with the same properties. `Equal` tells the two apart: write the type with `&` too."
      : "`found` is an intersection (`A & B`), `expected` one object type with the same properties. `Equal` tells the two apart: write the type as one object type.";
  }
  if (foundText === expectedText) {
    return "Both types print the same, but TypeScript still sees a difference. Look inside the named types they use: a `readonly` or optional (`?`) modifier, or an intersection (`A & B`) where the other side has one object type.";
  }
  const withoutReadonly = (text: string): string => text.replaceAll("readonly ", "");
  const withoutOptional = (text: string): string => text.replaceAll("?:", ":");
  if (withoutReadonly(foundText) === withoutReadonly(expectedText)) {
    return "The types only differ in their `readonly` modifiers.";
  }
  if (withoutOptional(foundText) === withoutOptional(expectedText)) {
    return "The types only differ in which properties are optional (`?`).";
  }
  if (withoutOptional(withoutReadonly(foundText)) === withoutOptional(withoutReadonly(expectedText))) {
    return "The types only differ in their `readonly` and optional (`?`) modifiers.";
  }
  return undefined;
}

/**
 * Both are object types, or intersections of them, with the same property
 * names, and each is assignable to the other: their properties have the same
 * types, and the same optional (`?`) ones.
 */
function sameProperties(checker: Checker, a: Type, b: Type): boolean {
  const isObjectLike = (type: Type): boolean =>
    type.isObjectType() || (type.isIntersectionType() && type.getTypes().every((member) => member.isObjectType()));
  if (!isObjectLike(a) || !isObjectLike(b)) return false;
  const names = (type: Type): string =>
    checker
      .getPropertiesOfType(type)
      .map((property) => property.name)
      .sort()
      .join("\n");
  return names(a) === names(b) && checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a);
}

function referenceName(node: TypeReferenceNode): string | undefined {
  const name = node.typeName;
  if (isIdentifier(name)) return name.text;
  // `Types.Equal<A, B>`, with a namespace import.
  return isQualifiedName(name) ? name.right.text : undefined;
}
