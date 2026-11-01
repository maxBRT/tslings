# Variables

TypeScript variables are JavaScript variables: `const` for values that never get
reassigned, `let` for the ones that do. Experienced TypeScript developers use `const` by
default, because it tells the reader that the value stays put, and because TypeScript
gives a `const` the most precise type it can.

You rarely write a variable's type yourself. TypeScript infers it from the initial value
(`let count = 0` is a `number`) and holds the variable to that type from then on. You
annotate a variable when there's no initial value to infer from (`let fee: number;`), or
when you want a different type than the inferred one, such as a `let` that may only hold a
few specific strings.

## Further information

- [Variable Declarations](https://www.typescriptlang.org/docs/handbook/variable-declarations.html)
- [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [Everyday Types: Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [Narrowing: Assignments](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#assignments)
