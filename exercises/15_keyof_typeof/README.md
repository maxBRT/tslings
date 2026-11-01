# keyof and typeof

TypeScript can compute types from other types and from values, so you write
each fact once. `typeof value` in a type position gives the type of a value:
write the default config, derive its type. `keyof T` gives the union of T's
property names, and `keyof typeof obj` the keys of an object value.

Indexed access types read a type out of another one with the same brackets as
JavaScript: `User["email"]`, `Order["billing"]["interval"]`. `T[number]` is the
element type of an array or tuple type, and `T[keyof T]` the union of all of
T's value types. With `as const`, a list such as
`const PLANS = ["free", "pro"] as const` exists at runtime AND gives you the
union `"free" | "pro"` through `(typeof PLANS)[number]`. That's how TypeScript
code replaces enums and keeps lists and types from disagreeing.

Combined with generics, `K extends keyof T` and `T[K]` tie a key to the type of
its value. Typed getters, setters, form libraries and state stores are built on
that one pattern.

## Further information

- [`typeof` type operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [`keyof` type operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [Indexed access types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [Using type parameters in generic constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#using-type-parameters-in-generic-constraints)
