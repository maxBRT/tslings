# Testing

Every exercise so far ended with tests you weren't allowed to touch. This chapter hands you the
pen. Node ships its own test runner, `node:test`, with `describe`, `it`, hooks and mocks, and an
assertion library in `node:assert/strict`. Neither needs an install, and Node runs your `.ts`
test files directly, so a TypeScript project can skip Jest or Vitest entirely if it wants to.

A TypeScript codebase needs two kinds of tests. Runtime tests check values. Type tests check
what the compiler infers, which matters as soon as other code relies on your types: a function
that quietly starts returning `any` passes every runtime test while switching off type checking
for all its callers. Type tests are ordinary code that only has to compile. `Expect<Equal<A, B>>`
fails when two types differ, and `// @ts-expect-error` fails when a misuse starts compiling.
Libraries like `expect-type` and Vitest's `expectTypeOf` package the same ideas.

One rule runs through the chapter: a test is only worth something if it fails when the code is
wrong. You'll write checks that must pass on working code and fail on broken copies of it.

## Further information

- [`node:test`](https://nodejs.org/api/test.html)
- [Mocking in `node:test`](https://nodejs.org/api/test.html#mocking)
- [`node:assert`](https://nodejs.org/api/assert.html)
- [`// @ts-expect-error` comments (TypeScript 3.9)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments)
- [Running TypeScript natively in Node](https://nodejs.org/api/typescript.html)
