// Classes take type parameters like functions do. `class Repository<T>` is written once and
// stores any kind of entity, with full type checking for each one: a `Repository<Product>`
// only accepts and returns `Product`s.
//
// Methods that return the object itself allow chaining: `repo.add(a).add(b)`. Declare their
// return type as `this`, not as the class name. `this` is the type of whatever object the
// method is called on, so in a subclass the chain keeps the subclass and its extra methods.
//
// Make `Repository` generic over the type of entity it stores (every entity has an `id`), and
// make `add` chainable on subclasses too.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Entity = { readonly id: string };

// The constraint lets the class read `item.id`, whatever `T` is.
class Repository<T extends Entity> {
  readonly #items = new Map<string, T>();

  add(item: T): this {
    this.#items.set(item.id, item);
    return this;
  }

  get(id: string): T | undefined {
    return this.#items.get(id);
  }

  all(): T[] {
    // On Node 24, `this.#items.values().toArray()` does the same with an iterator helper.
    return [...this.#items.values()];
  }
}

type Product = { readonly id: string; readonly name: string; readonly stock: number };

class ProductRepository extends Repository<Product> {
  inStock(): Product[] {
    return this.all().filter((product) => product.stock > 0);
  }
}

// Don't change the tests below.

const keyboard: Product = { id: "kb-1", name: "Keyboard", stock: 12 };
const mouse: Product = { id: "ms-1", name: "Mouse", stock: 0 };

test("stores and finds entities", () => {
  const products = new Repository<Product>().add(keyboard).add(mouse);
  assert.equal(products.get("kb-1")?.name, "Keyboard");
  assert.equal(products.get("nope"), undefined);
  assert.deepEqual(products.all(), [keyboard, mouse]);
});

test("chaining keeps the subclass", () => {
  const inStock = new ProductRepository().add(keyboard).add(mouse).inStock();
  assert.deepEqual(inStock, [keyboard]);
});

test("works for any entity, and any subclass", () => {
  type User = { readonly id: string; readonly email: string };
  class UserRepository extends Repository<User> {
    byEmail(email: string): User | undefined {
      return this.all().find((user) => user.email === email);
    }
  }
  const users = new UserRepository()
    .add({ id: "u1", email: "ada@example.com" })
    .add({ id: "u2", email: "grace@example.com" });
  assert.equal(users.byEmail("grace@example.com")?.id, "u2");
  assert.equal(users.get("u1")?.email, "ada@example.com");
});

type _tests = [
  Expect<Equal<ReturnType<Repository<Product>["get"]>, Product | undefined>>,
  Expect<Equal<ReturnType<Repository<Product>["all"]>, Product[]>>,
  Expect<Equal<ReturnType<ProductRepository["add"]>, ProductRepository>>,
];
