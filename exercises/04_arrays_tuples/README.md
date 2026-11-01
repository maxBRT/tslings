# Arrays and Tuples

An array type is written `T[]` (or `Array<T>`): a list of any length where
every element has the type `T`. A tuple type like `[width: number, height: number]`
is an array with a fixed length and a type for each position. Functions often
return tuples when they produce a small group of values, like React's
`useState` returning `[state, setState]`.

Two habits make arrays safer in TypeScript. Take arrays you only read as
`readonly T[]`, so the compiler stops you from sorting or pushing into the
caller's data. And with `noUncheckedIndexedAccess`, an option that `strict`
doesn't include but that tslings and many strict projects turn on, reading
`xs[i]` gives `T | undefined`: you handle the empty or short array instead of
finding out in production.

TypeScript infers most array types for you, including through `map`, `filter`
and `reduce`. Since TypeScript 5.5, `xs.filter((x) => x !== undefined)` even
removes `undefined` from the result's type.

## Further information

- [Arrays](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#arrays)
- [The ReadonlyArray type](https://www.typescriptlang.org/docs/handbook/2/objects.html#the-readonlyarray-type)
- [Tuple types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types)
- [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)
- [Inferred type predicates (TypeScript 5.5)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- [`Array.prototype.toSorted`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
- [`Array.prototype.at`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)
