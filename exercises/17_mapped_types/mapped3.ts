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

type CartItem = { sku: string; quantity: number };

type CartStore = {
  items: readonly CartItem[];
  couponCode: string | null;
  addItem: (item: CartItem) => void;
  clear: () => void;
};

// Every function type fits this one, whatever its parameters and return type.
type AnyFunction = (...args: never[]) => unknown;

// TODO: Keep only the keys whose value is NOT a function.
type StateOf<T> = { [K in keyof T]: T[K] };

// TODO: Keep only the keys whose value IS a function.
type ActionsOf<T> = { [K in keyof T]: T[K] };

function createCartStore(): CartStore {
  const store: CartStore = {
    items: [],
    couponCode: null,
    addItem: (item) => {
      store.items = [...store.items, item];
    },
    clear: () => {
      store.items = [];
      store.couponCode = null;
    },
  };
  return store;
}

// What gets saved to localStorage.
function persistedState(store: CartStore): StateOf<CartStore> {
  return { items: store.items, couponCode: store.couponCode };
}

// What the toolbar component receives: it can act on the cart, not read it.
function toolbarActions(store: CartStore): ActionsOf<CartStore> {
  return { addItem: store.addItem, clear: store.clear };
}

// Don't change the tests below.

test("the persisted state survives a JSON round trip", () => {
  const store = createCartStore();
  store.addItem({ sku: "mug-01", quantity: 2 });
  store.couponCode = "WELCOME10";
  const saved = JSON.stringify(persistedState(store));
  assert.deepEqual(JSON.parse(saved), {
    items: [{ sku: "mug-01", quantity: 2 }],
    couponCode: "WELCOME10",
  });
});

test("the toolbar actions update the store", () => {
  const store = createCartStore();
  const { addItem, clear } = toolbarActions(store);
  addItem({ sku: "tee-04", quantity: 1 });
  assert.equal(store.items.length, 1);
  clear();
  assert.deepEqual(store.items, []);
});

type _tests = [
  Expect<Equal<StateOf<CartStore>, { items: readonly CartItem[]; couponCode: string | null }>>,
  Expect<Equal<ActionsOf<CartStore>, { addItem: (item: CartItem) => void; clear: () => void }>>,
  // Any store works, including one written with method syntax.
  Expect<Equal<StateOf<{ count: number; increment(): void }>, { count: number }>>,
  Expect<Equal<ActionsOf<{ count: number; increment(): void }>, { increment(): void }>>,
];
