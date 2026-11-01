# Objects

Most TypeScript code is about objects: API responses, props, config, state.
An object type lists the properties a value has and their types. Properties can
be optional (`?`) or `readonly`, and objects used as dictionaries get an index
signature or a `Record<Keys, Value>` type. tslings turns on
`exactOptionalPropertyTypes`, so an optional property may be missing, but not
set to `undefined`: a strict setting that catches real bugs, and that you'll
meet in strict codebases.

You can name an object type with an `interface` or a `type` alias. For plain
shapes they're interchangeable, so codebases pick one and stick to it
(typescript-eslint's `consistent-type-definitions` rule enforces the choice);
tslings uses both. Only an interface can be reopened to add properties
(declaration merging, in a later chapter), and only a type alias can name a
union, a tuple, or a type computed from other types.

TypeScript's type system is structural: a value fits a type when it has the
right properties, whatever it was declared as. There's no need to say that an
object "implements" a type. The flip side is that two types with the same shape
are interchangeable, and that the compiler checks object literals more strictly
than other values, to catch typos in property names.

## Further information

- [Object types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Differences between type aliases and interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [Type compatibility (structural typing)](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes)
- [`Record<Keys, Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)
- [Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
