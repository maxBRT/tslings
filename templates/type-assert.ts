// Type-level test helpers used by tslings exercises.
//
// `Expect<Equal<A, B>>` only compiles when the types `A` and `B` are exactly
// the same. Exercises use it to check types the same way runtime tests check
// values. You don't need to edit this file.

/** `true` when `X` and `Y` are exactly the same type, `false` otherwise. */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/** `true` when `X` and `Y` are different types. */
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;

/** Compiles only when `T` is `true`. Wrap an `Equal<...>` in it. */
export type Expect<T extends true> = T;

/** `true` when `T` is `any`. Useful to make sure a type didn't silently degrade. */
export type IsAny<T> = 0 extends 1 & T ? true : false;
