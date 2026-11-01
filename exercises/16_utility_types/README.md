# Utility types

TypeScript ships a set of generic types that build new types from existing
ones. Some change every property at once (`Partial`, `Required`, `Readonly`).
Some reshape an object type (`Pick`, `Omit`, `Record`). Some read types out of
functions (`Parameters`, `ReturnType`, and `Awaited` to unwrap promises), and
some filter unions (`Exclude`, `Extract`, `NonNullable`).

They exist so you write each shape once. Rather than copying `User` into
`NewUser` and `UserPatch` and watching the copies drift, TypeScript code
derives them: `type UserPatch = Partial<Omit<User, "id">>`. When `User`
changes, everything built from it follows, and the compiler points at the code
that needs updating.

`satisfies` fits in here too: `const FLAGS = { ... } satisfies Record<string, Flag>`
checks a config against a type without replacing the config's own precise
type. Its keys stay known, and so do its literal values wherever the checked
type allows literals (a `Team` union, say). Other strings still widen to
`string`: write `as const satisfies ...` to keep every literal.

## Further information

- [Utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [The `satisfies` operator (TypeScript 4.9)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [`Awaited` (TypeScript 4.5)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#the-awaited-type-and-promise-improvements)
