# Advanced patterns

This chapter collects patterns you meet in well-typed codebases once the basics feel natural.
None of them is exotic. Branded IDs, `satisfies` on config tables, overloads, `NoInfer`, variadic
tuples, `using` and module augmentation all show up in ordinary application code, and in the
type definitions of the libraries you install.

Most of them are about precision. You tell TypeScript a little more about what you mean, and it
catches a bug you would otherwise meet in production: two IDs passed in the wrong order, a typo
in a default value, a connection that never went back to its pool. None of them replaces
inference. Each one is a small hint in one place, and inference does the rest.

`using` is the newest of them, on the JavaScript side too: Node.js runs it from version 24 on.

## Further information

- [The `satisfies` operator (TypeScript 4.9)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [Type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [Function overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [The `NoInfer` utility type (TypeScript 5.4)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type)
- [Variadic tuple types (TypeScript 4.0)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types)
- [`using` declarations (TypeScript 5.2)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management)
- [`using` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using),
  with the runtimes that support it
- [Declaration merging and module augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
