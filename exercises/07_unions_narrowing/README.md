# Unions and narrowing

A union type `A | B` describes a value that can be one of several types:
`string | number`, `Date | { cron: string }`, or a set of literals like
`"newest" | "oldest"`. On a union, TypeScript only lets you use what every member
has in common.

To do more, you narrow the value. TypeScript reads your ordinary JavaScript checks
(`typeof`, `instanceof`, `in`, `Array.isArray`, `===`, truthiness) and follows
them through `if`, `return`, `throw`, `switch` and assignments. This is called
control-flow analysis. The same variable can have a narrower type on each line,
depending on what the code above it has already ruled out. There are no extra
annotations to write. The checks are the ones you'd write in plain JavaScript,
and TypeScript tells you when you forgot a case.

Narrowing has limits. A callback may run later, when a `let` variable holds
something else, so TypeScript doesn't carry narrowing into callbacks for
variables that can still change. Copy the value into a `const` first.

## Further information

- [Union types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Literal types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [Preserved narrowing in closures (TypeScript 5.4)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#preserved-narrowing-in-closures-following-last-assignments)
- [`Array.isArray()` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)
