# Generics

Generics let one function or type work with many types without forgetting
which one it got. A type parameter, written `<T>`, is a placeholder that each
use fills in, usually by inference: `unique(["a", "b"])` sets `T` to `string`,
so the caller gets a `string[]` back. That's the difference with `unknown`,
which accepts anything but hands back values nobody can use without checking
them again, and with `any`, which turns type checking off altogether.

A type parameter can be constrained (`T extends { id: string }`) to say what
the function needs from it, can have a default (`type Result<T, E = Error>`),
and since TypeScript 5.0 can be `const` to infer literal types. Generic types
such as `ApiResponse<T>` and `Result<T, E>` are everywhere in real code, and so
are generic helpers that take and return functions.

Experienced TypeScript developers also know when NOT to reach for generics:
a type parameter should connect at least two things, such as an argument and
the return type. One that appears only once adds noise, and one that appears
only in the return type is a type assertion in disguise.

## Further information

- [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Generic functions and guidelines for writing them](https://www.typescriptlang.org/docs/handbook/2/functions.html#generic-functions)
- [`keyof` type operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [`const` type parameters (TypeScript 5.0)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters)
