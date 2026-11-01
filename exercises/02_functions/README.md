# Functions

Functions are where types do most of their work. Parameters need an annotation, because
TypeScript can't guess how a function will be called. The exceptions are parameters with a
default value and callbacks, both covered in this chapter. Return types are inferred, but
experienced developers still write them on exported functions: the annotation becomes a
contract that TypeScript checks inside the function, instead of letting a mistake leak out
to every caller.

Functions are also values, so they have types, written like arrow functions:
`(event: string) => void`. Once TypeScript knows which function type is expected, it types
the parameters of the callbacks you write there, which is why you'll rarely annotate a
callback's parameters in idiomatic code.

## Further information

- [More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Everyday Types: Functions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#functions)
- [Contextual Typing](https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing)
- [Assignability of Functions returning `void`](https://www.typescriptlang.org/docs/handbook/2/functions.html#assignability-of-functions)
