# Iterators and generators

`for...of`, spread, `Array.from` and destructuring all run on one protocol: an object with a
`[Symbol.iterator]()` method hands out values one at a time. TypeScript types that protocol as
`Iterable<T>`, and the values come out with their type intact. A generator function (`function*`)
is the short way to write an iterator. Its type, `Generator<Yield, Return, Next>`, covers what it
yields, what it returns when it finishes, and what callers send back in through `next()`.

Iterators are lazy. Nothing is computed until someone asks for the next value, so a pipeline can
stop after the tenth match of a ten-gigabyte log. Since Node 22, iterators have their own `map`,
`filter`, `take` and `toArray` helpers, typed on `IteratorObject<T>`. They are the lazy
counterparts of the array methods you already use.

Async generators (`async function*`) do the same for values that arrive over time: pages of an
API, lines of a stream, messages from a queue. You consume them with `for await`, or collect them
with `Array.fromAsync`.

## Further information

- [Iterators and generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)
- [Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [Iterator helpers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator)
- [TypeScript 5.6: iterator helper methods and `IteratorObject`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html)
- [for await...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- [Array.fromAsync](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)
