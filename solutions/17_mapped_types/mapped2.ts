// A mapped type over `keyof T` copies each property's modifiers (`readonly` and `?`)
// from `T`. You can also add a modifier, or remove one by putting `-` in front of it:
//
//   type Readonly<T> = { readonly [K in keyof T]: T[K] };  // adds `readonly`
//   type Required<T> = { [K in keyof T]-?: T[K] };         // removes `?`
//
// Immer, a popular library for immutable updates, relies on this. Your state stays
// read-only, but inside `produce` you get a draft copy that you're allowed to mutate,
// and you get a new object back. The draft's type is the state's type without `readonly`.
//
// Fix `Draft<T>` so the recipes below can assign to the draft.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Todo = {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
  readonly dueDate?: string;
};

// Writing `{ [K in keyof T]: T[K] }` (no modifier) would copy `readonly` from `T`:
// only `-readonly` removes it. Immer's real `Draft` also recurses into nested objects;
// chapter 18 shows how to write recursive types.
type Draft<T> = { -readonly [K in keyof T]: T[K] };

function produce<T extends object>(base: T, recipe: (draft: Draft<T>) => void): T {
  // A deep copy, so mutating the draft never touches `base`.
  const draft = structuredClone(base);
  recipe(draft);
  return draft;
}

function complete(todo: Todo): Todo {
  return produce(todo, (draft) => {
    draft.done = true;
  });
}

function reschedule(todo: Todo, dueDate: string): Todo {
  return produce(todo, (draft) => {
    draft.dueDate = dueDate;
  });
}

// Don't change the tests below.

const todo: Todo = { id: "t1", title: "Write the release notes", done: false };

test("complete returns a done copy", () => {
  assert.deepEqual(complete(todo), { ...todo, done: true });
  assert.equal(todo.done, false, "the original todo must not change");
});

test("reschedule sets a due date", () => {
  assert.equal(reschedule(todo, "2026-12-01").dueDate, "2026-12-01");
  assert.equal(todo.dueDate, undefined, "the original todo must not change");
});

type _tests = [
  Expect<Equal<Draft<Todo>, { id: string; title: string; done: boolean; dueDate?: string }>>,
  Expect<Equal<Draft<{ readonly count: number }>, { count: number }>>,
  // Mapped types over arrays and tuples give back arrays and tuples.
  Expect<Equal<Draft<readonly string[]>, string[]>>,
];
