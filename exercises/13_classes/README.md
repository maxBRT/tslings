# Classes

TypeScript classes are JavaScript classes with types: fields are declared with their types in
the class body, `strict` makes sure each one is initialized, and `readonly` stops a field from
being reassigned after the constructor. For privacy, prefer JavaScript's `#private` fields,
which are hidden at runtime too, over TypeScript's `private`, which only the compiler enforces.

Classes connect to the rest of the type system: `implements` checks a class against an
interface, `abstract` classes leave members for their subclasses to fill in, `override` marks
the methods that replace a base method, and classes can be generic, like functions.

Because Node runs TypeScript by erasing types, the few TypeScript features that generate
JavaScript are off limits: parameter properties (`constructor(private x: number)`) and
`enum`. Modern TypeScript code replaces them with explicit fields, and with unions of string
literals or `as const` objects.

## Further information

- [Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [Private elements (`#private`) on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig/#noImplicitOverride)
- [`erasableSyntaxOnly` (TypeScript 5.8)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#the---erasablesyntaxonly-option)
- [Enums, and objects as an alternative](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums)
- [Running TypeScript natively in Node.js](https://nodejs.org/api/typescript.html)
