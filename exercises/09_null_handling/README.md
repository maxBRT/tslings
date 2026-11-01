# Null handling

In JavaScript, `null` and `undefined` are behind the most common runtime error:
"Cannot read properties of undefined". With `strictNullChecks`, which `strict`
turns on, they're separate types that only fit where the type says so.
A `string` can't be `undefined`, and a value typed `User | undefined` can't be
used until you've ruled out the `undefined`.

TypeScript code deals with missing values in a few idiomatic ways: optional
chaining (`user?.address?.city`) to read through them, nullish coalescing
(`count ?? 0`) and `??=` to supply defaults without clobbering `0` or `""`,
a check followed by `return` or `throw` when absence is an error, and
`T | undefined` return types so callers know when a lookup can come back empty.

The non-null assertion `value!` is the dishonest way. It silences the compiler
without checking anything, and the `undefined` crashes later, somewhere else.
tslings doesn't allow it; you'll see the honest alternatives in this chapter.

## Further information

- [`null` and `undefined`](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#null-and-undefined)
- [Truthiness narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#truthiness-narrowing)
- [`strictNullChecks`](https://www.typescriptlang.org/tsconfig/#strictNullChecks)
- [Optional chaining (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Nullish coalescing `??` (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [Nullish coalescing assignment `??=` (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment)
