// Failing type tests. When `Expect<Equal<A, B>>` fails, TypeScript only says
// "Type 'false' does not satisfy the constraint 'true'". The learner needs to
// see both types the way TypeScript sees them, like rustc's "expected X,
// found Y". Exercises write the type under test first and the expected type
// second: `Expect<Equal<typeof result, Result<User>>>`.

import type { Node, SourceFile, TypeNode, TypeReferenceNode } from "typescript/unstable/ast";
import { isIdentifier, isQualifiedName, isTypeReferenceNode } from "typescript/unstable/ast/is";
import { NodeBuilderFlags } from "typescript/unstable/sync";
import type { Checker } from "typescript/unstable/sync";

/** A type shown below an error: `= expected: { ok: true }`. */
export interface ShownType {
  readonly label: string;
  readonly type: string;
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

/** Both sides of a failing type test, as TypeScript prints them. */
export function describeTypeTest(test: TypeReferenceNode, checker: Checker): ShownType[] {
  const [found, expected] = test.typeArguments ?? [];
  if (found === undefined || expected === undefined) return [];
  const [foundType = "", expectedType = ""] = printTypes(checker, [found, expected]);
  // `NotEqual` fails when both sides are the same type.
  if (referenceName(test) === "NotEqual") return [{ label: "both types are", type: foundType }];
  return [
    { label: "expected", type: expectedType },
    { label: "found", type: foundType },
  ];
}

function printTypes(checker: Checker, nodes: readonly TypeNode[]): string[] {
  const types = checker.getTypeAtLocation(nodes);
  return nodes.map((node, index) => {
    const type = types[index];
    // Without types, the source text is the next best thing.
    if (type === undefined) return node.getText().replace(/\s+/g, " ").trim();
    // Show what an alias stands for: `[payload: undefined]` says more than `EmitArgs<undefined>`.
    // (`typeToString` takes TypeScript's type format flags, whose values match `NodeBuilderFlags`.)
    return checker.typeToString(type, node, NodeBuilderFlags.InTypeAlias);
  });
}

function referenceName(node: TypeReferenceNode): string | undefined {
  const name = node.typeName;
  if (isIdentifier(name)) return name.text;
  // `Types.Equal<A, B>`, with a namespace import.
  return isQualifiedName(name) ? name.right.text : undefined;
}
