// A mapped type can choose each key's new name with `as`:
//
//   { [K in keyof T as NewName]: T[K] }
//
// If the new name is `never`, the key is dropped. Pair `as` with a conditional type,
// `A extends B ? X : Y` ("if A fits B, then X, else Y"; chapter 18 covers them), to
// filter keys by the type of their value:
//
//   type StringFields<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };
//
// Stores like Zustand keep state and actions in one object, but only the state can
// be saved to localStorage (functions don't survive `JSON.stringify`).
// Write `StateOf<T>` (drop the functions) and `ActionsOf<T>` (keep only the functions).

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type EditorStore = {
  content: string;
  /** Where the next text goes, as an offset into `content`. */
  cursor: number;
  insertText: (text: string) => void;
  undo: () => void;
};

// Every function type fits this one, whatever its parameters and return type.
type AnyFunction = (...args: never[]) => unknown;

// TODO: Keep only the keys whose value is NOT a function.
type StateOf<T> = { [K in keyof T]: T[K] };

// TODO: Keep only the keys whose value IS a function.
type ActionsOf<T> = { [K in keyof T]: T[K] };

function createEditorStore(): EditorStore {
  const undoStack: string[] = [];
  const store: EditorStore = {
    content: "",
    cursor: 0,
    insertText: (text) => {
      undoStack.push(store.content);
      const { content, cursor } = store;
      store.content = content.slice(0, cursor) + text + content.slice(cursor);
      store.cursor = cursor + text.length;
    },
    undo: () => {
      const previous = undoStack.pop();
      if (previous === undefined) return;
      store.content = previous;
      store.cursor = Math.min(store.cursor, previous.length);
    },
  };
  return store;
}

// What gets saved to localStorage, so a reload brings the draft back.
function persistedState(store: EditorStore): StateOf<EditorStore> {
  return { content: store.content, cursor: store.cursor };
}

// What the toolbar component receives: it can act on the editor, not read it.
function toolbarActions(store: EditorStore): ActionsOf<EditorStore> {
  return { insertText: store.insertText, undo: store.undo };
}

// Don't change the tests below.

test("the persisted state survives a JSON round trip", () => {
  const store = createEditorStore();
  store.insertText("Hello");
  store.cursor = 0;
  store.insertText("> ");
  const saved = JSON.stringify(persistedState(store));
  assert.deepEqual(JSON.parse(saved), { content: "> Hello", cursor: 2 });
});

test("the toolbar actions update the store", () => {
  const store = createEditorStore();
  const { insertText, undo } = toolbarActions(store);
  insertText("Hi");
  insertText("!");
  assert.equal(store.content, "Hi!");
  undo();
  assert.equal(store.content, "Hi");
  assert.equal(store.cursor, 2);
});

type _tests = [
  Expect<Equal<StateOf<EditorStore>, { content: string; cursor: number }>>,
  Expect<Equal<ActionsOf<EditorStore>, { insertText: (text: string) => void; undo: () => void }>>,
  // Any store works, including one written with method syntax.
  Expect<Equal<StateOf<{ count: number; increment(): void }>, { count: number }>>,
  Expect<Equal<ActionsOf<{ count: number; increment(): void }>, { increment(): void }>>,
];
