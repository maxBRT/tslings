# Mapped types

A mapped type builds a new object type by looping over a set of keys, usually the keys
of another type: `{ [K in keyof T]: ... }`. For each key `K`, you decide the type of the
new property, and `T[K]` gives you the type of the old one. `Partial`, `Readonly`,
`Required`, `Pick` and `Record` from the previous chapter are all mapped types, written in
a few lines in TypeScript's own `lib.es5.d.ts`.

Mapped types are how you keep one type as the single source of truth. Instead of writing
a `UserForm`, a `UserFormErrors` and a `UserFormTouched` that slowly drift apart, you write
`User` once and derive the rest. Add a field to `User` and every derived type updates, and
the compiler points at each place that now needs handling.

They can also change modifiers (`readonly`, `?`, or remove them with `-readonly` and
`-?`) and rename or drop keys with an `as` clause. Chapter 19 uses `as` to rename keys
with template literal types.

## Further information

- [Mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [Utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Key remapping in mapped types (TypeScript 4.1 release notes)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#key-remapping-in-mapped-types)
