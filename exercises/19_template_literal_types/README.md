# Template literal types

Template literal types are template strings at the type level: `` `${number}px` `` is the
type of every string made of a number followed by "px". A union in a placeholder expands to
every combination, so `` `${"margin" | "padding"}-${"top" | "bottom"}` `` is four string
literal types. The built-in `Uppercase`, `Lowercase`, `Capitalize` and `Uncapitalize`
transform string literal types, which is how `"click"` becomes `"onClick"`.

TypeScript developers use them to type the strings that carry meaning in an app: CSS
values, event and handler names, route patterns, translation keys, environment variable
names. Combined with key remapping in mapped types, they rename keys (`getName`,
`onChange`). Combined with `infer` in conditional types, they parse strings at compile time:
a router can read `"/users/:id"` and know the handler receives an `id`.

This is the most library-flavoured chapter. You'll mostly *use* these types through
frameworks, but knowing how they work lets you read their type errors, and write the
small helpers your own codebase needs.

## Further information

- [Template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Intrinsic string manipulation types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#intrinsic-string-manipulation-types)
- [Key remapping via `as`](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as)
- [Template literal types (TypeScript 4.1 release notes)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#template-literal-types)
