# Error handling

JavaScript lets you throw any value, so TypeScript can't know what a `catch` block receives:
the caught value is `unknown`, and you narrow it like any other untrusted data, usually with
`instanceof`. Custom error classes extend `Error` with a `name` and the fields callers need
(an HTTP status, a field name), and `cause` chains a low-level error to the clearer one you
throw instead.

A thrown error is invisible in a function's type. For failures the caller is expected to
handle (invalid input, a missing record), many TypeScript codebases return a `Result` instead:
a discriminated union that holds either a value or an error, so the compiler makes the caller
deal with both. Keep `throw` for things that are actually broken, and for those, a function
that always throws returns `never`, which TypeScript uses to narrow the code around it.

## Further information

- [`useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- [The `never` type](https://www.typescriptlang.org/docs/handbook/2/functions.html#never)
- [Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Custom error types on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types)
- [`Error.prototype.cause` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
- [`try...catch` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
