// Generic functions can take functions and return functions. Type parameters
// then connect them. `pipe(first, second)` returns a function that runs
// `first`, then `second` on its result. So:
//   - the result takes what `first` takes        (call it A)
//   - `second` takes what `first` returns        (B)
//   - the result returns what `second` returns   (C)
// Three type parameters, `<A, B, C>`, say exactly that.
//
// Bonus: once `B` is inferred from `first`, TypeScript types the parameter of
// `second` for you, so callers don't annotate it.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// TypeScript infers `A` and `B` from `first` (its parameter is annotated),
// then uses `B` to type `second`'s parameter, then infers `C` from what
// `second` returns. Inference goes left to right through the arguments.
function pipe<A, B, C>(first: (input: A) => B, second: (input: B) => C): (input: A) => C {
  return (input) => second(first(input));
}

// Don't change the tests below.

test("builds a slug from a title", () => {
  const slugify = pipe(
    (title: string) => title.trim().toLowerCase(),
    (clean) => clean.replaceAll(/\s+/g, "-"),
  );
  type _test = Expect<Equal<typeof slugify, (input: string) => string>>;
  assert.equal(slugify("  Hello TypeScript World "), "hello-typescript-world");
});

test("parses a price into cents", () => {
  const toCents = pipe(
    (raw: string) => Number.parseFloat(raw),
    (amount) => Math.round(amount * 100),
  );
  type _test = Expect<Equal<typeof toCents, (input: string) => number>>;
  assert.equal(toCents("19.99"), 1999);
});

interface Post {
  title: string;
  words: number;
}

test("each step can change the type", () => {
  const isLongRead = pipe(
    (post: Post) => post.words / 200,
    (minutes) => minutes >= 10,
  );
  type _test = Expect<Equal<typeof isLongRead, (input: Post) => boolean>>;
  assert.equal(isLongRead({ title: "Generics in depth", words: 3000 }), true);
  assert.equal(isLongRead({ title: "Release notes", words: 400 }), false);
});
