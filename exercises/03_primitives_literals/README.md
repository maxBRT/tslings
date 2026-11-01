# Primitives and literal types

TypeScript's primitive types are JavaScript's primitive values: `string`, `number`,
`boolean`, `bigint`, `symbol`, `null` and `undefined`, always written in lowercase. With
`strict` on, `null` and `undefined` are separate types, so a value that may be missing has
to say so in its type (`number | null`), and TypeScript makes you handle that case.

Literal types go one step further: `"warn"` is a type whose only value is the string
"warn". A union of literals, `"debug" | "info" | "warn" | "error"`, is how TypeScript
developers write what other languages call an enum: plain strings at runtime, and a type
checker that rejects every other string. `as const` gives you literal types from a value
you need at runtime anyway, so a list of options can be both data and type. It turns an
array into a `readonly` tuple and makes every property of an object `readonly`, each one
keeping its literal type.

TypeScript's `enum` keyword isn't used in tslings: it generates JavaScript code, so Node
can't run it by erasing types. A later chapter shows how to replace one you find in
existing code.

## Further information

- [Everyday Types: Primitives](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#the-primitives-string-number-and-boolean)
- [Everyday Types: Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [Everyday Types: `null` and `undefined`](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#null-and-undefined)
- [Const assertions (TypeScript 3.4)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
- [MDN: BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [MDN: Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
