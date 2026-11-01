# Async

TypeScript types asynchronous code with `Promise<T>`: a value of type `T` that isn't there yet.
An `async` function always returns a `Promise`, `await` unwraps it, and `Awaited<T>` does the
same at the type level. Because TypeScript knows which values are promises, it catches some
forgotten `await`s, like a promise used as a condition or a property read on a promise. Others
still compile, so they're worth learning to spot.

The standard library's async helpers come with precise types. `Promise.all` keeps one type per
position when you give it a tuple. `Promise.allSettled` returns a discriminated union that you
narrow on `status`. `Promise.withResolvers` and `AbortSignal` cover promises that are settled
from somewhere else, or abandoned. One gap to watch for: a rejection reason is typed `any`,
because JavaScript lets you reject with anything. Treat it as `unknown`, like the error in a
`catch` block.

Async iteration (`for await`, async generators, `Array.fromAsync`) comes in the next chapter,
with the other iterators.

## Further information

- [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [`Awaited<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype)
- [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
  and [Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [Promise.withResolvers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers)
- [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [typescript-eslint's no-floating-promises rule](https://typescript-eslint.io/rules/no-floating-promises/)
