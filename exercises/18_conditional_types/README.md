# Conditional types

A conditional type is an `if` for types: `T extends U ? X : Y` gives `X` when `T` is
assignable to `U`, and `Y` otherwise. On its own that looks like a curiosity. Combined with
generics, it lets one signature adapt to its type arguments: an `emit` function that only
asks for a payload when the event has one, or a page whose props follow whatever its data
loader returns.

`infer` makes conditional types useful for taking types apart. Inside the `extends`
pattern, `infer X` captures a piece of the matched type: the element of an array, the
resolved value of a promise, the return type of a function. `ReturnType`, `Parameters` and
`Awaited` are all written this way.

Two behaviours surprise everyone at first. Given a union, a conditional type on a bare type
parameter runs once per member (it distributes), which is how `Exclude` and `Extract` filter
unions, and wrapping the type in `[T]` turns that off. And conditional types can be
recursive, which is how you write `DeepReadonly` or flatten nested arrays. Keep them for
library-style helpers: in application code, a plain union or an overload is often easier
to read.

You use such helpers every day, though. Validation libraries like Zod compute the type of
the data a schema accepts from the schema itself, with a mapped type full of conditional
types. The last exercise builds a small one.

## Further information

- [Conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Creating types from types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Recursive conditional types (TypeScript 4.1 release notes)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#recursive-conditional-types)
