# Unknown and type guards

Data from outside your program (an HTTP response, a JSON file, a message from another window)
has no type TypeScript can trust. `JSON.parse` returns `any`, which turns type checking off for
everything it touches. TypeScript developers use `unknown` instead: any value fits in it, but you
can't use it until you've checked what it is.

The checks are ordinary JavaScript: `typeof`, `in`, `Array.isArray`. TypeScript understands them
and narrows the type as you go. To reuse a check, wrap it in a type guard
(`(value: unknown) => value is User`) or an assertion function
(`(value: unknown) => asserts value is User`), which throws instead of returning `false`.

The idiom to remember: parse untrusted data once, at the edge, into a precise type, and let the
rest of the code rely on that type. Libraries like Zod or Valibot automate this; in this chapter
you write the checks by hand to see what they do. In chapter 18 you'll build a tiny version of
such a library, where the type is computed from the schema.

## Further information

- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [`unknown`](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [Assertion functions (TypeScript 3.7)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [Inferred type predicates (TypeScript 5.5)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- [`JSON.parse` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
