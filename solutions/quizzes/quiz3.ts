// This quiz tests:
// - parsing `unknown` data with type guards (chapter 10)
// - Result types and custom error classes (chapter 11)
// - generic classes and constraints (chapters 12 and 13)
// - `keyof` and indexed access types (chapter 15)
// - utility types (chapter 16)
//
// A bookshop's admin API receives JSON request bodies and keeps its books in
// memory. Finish `Table<T>`, an in-memory table for any kind of record with an
// `id`, then `NewBook` and `parseNewBook`, which turns an untrusted request
// body into a `NewBook`. Work through the TODOs from top to bottom.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

class NotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`No record with id ${id}`);
    this.name = "NotFoundError";
    this.id = id;
  }
}

// The constraint lets the class read `row.id`; `T` stays the caller's own type.
class Table<T extends { id: string }> {
  readonly #rows = new Map<string, T>();

  insert(row: T): void {
    this.#rows.set(row.id, row);
  }

  get(id: string): T | undefined {
    return this.#rows.get(id);
  }

  // `Omit<T, "id">` removes `id`, `Partial` makes the rest optional. The type
  // of `updated` is `T & Partial<Omit<T, "id">>`, which TypeScript accepts as a
  // `T`. A missing record is an expected outcome, so it's a Result, not a throw.
  update(id: string, changes: Partial<Omit<T, "id">>): Result<T, NotFoundError> {
    const existing = this.#rows.get(id);
    if (existing === undefined) {
      return { ok: false, error: new NotFoundError(id) };
    }
    const updated = { ...existing, ...changes };
    this.#rows.set(id, updated);
    return { ok: true, value: updated };
  }

  // `K` ties the key to its value: `where("year", "1965")` doesn't compile.
  // `.values()` returns an iterator; `.filter()` and `.toArray()` are iterator
  // helpers (chapter 21). `[...this.#rows.values()].filter(...)` works too.
  where<K extends keyof T>(key: K, value: T[K]): T[] {
    return this.#rows
      .values()
      .filter((row) => row[key] === value)
      .toArray();
  }
}

interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  tags: readonly string[];
}

type NewBook = Omit<Book, "id">;

// `Array.isArray` narrows `unknown` to `any[]`; checking every element turns
// that into an honest `string[]`.
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Parse, don't validate: the function returns a typed NewBook built from the
// checked fields, not the original body. Each `"field" in body` check narrows
// `body` so that `body.field` exists (as `unknown`) and can be checked further.
function parseNewBook(body: unknown): Result<NewBook, string> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be an object" };
  }
  if (!("title" in body) || typeof body.title !== "string" || body.title.trim() === "") {
    return { ok: false, error: "title must be a non-empty string" };
  }
  if (!("author" in body) || typeof body.author !== "string" || body.author.trim() === "") {
    return { ok: false, error: "author must be a non-empty string" };
  }
  if (!("year" in body) || typeof body.year !== "number" || !Number.isInteger(body.year)) {
    return { ok: false, error: "year must be an integer" };
  }
  const tags = "tags" in body ? body.tags : [];
  if (!isStringArray(tags)) {
    return { ok: false, error: "tags must be an array of strings" };
  }
  return { ok: true, value: { title: body.title, author: body.author, year: body.year, tags } };
}

// Don't change the tests below.

const dune: Book = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  year: 1965,
  tags: ["sci-fi"],
};
const earthsea: Book = {
  id: "b2",
  title: "A Wizard of Earthsea",
  author: "Ursula K. Le Guin",
  year: 1968,
  tags: ["fantasy"],
};
const dispossessed: Book = {
  id: "b3",
  title: "The Dispossessed",
  author: "Ursula K. Le Guin",
  year: 1974,
  tags: ["sci-fi"],
};

function bookTable(): Table<Book> {
  const books = new Table<Book>();
  books.insert(dune);
  books.insert(earthsea);
  books.insert(dispossessed);
  return books;
}

describe("Table", () => {
  test("gets a record by id", () => {
    const found = bookTable().get("b1");
    type _test = Expect<Equal<typeof found, Book | undefined>>;
    assert.equal(found?.title, "Dune");
    assert.equal(bookTable().get("b9"), undefined);
  });

  test("updates some fields of a record", () => {
    const books = bookTable();
    const result = books.update("b2", { year: 1969, tags: ["fantasy", "classic"] });
    type _test = Expect<Equal<typeof result, Result<Book, NotFoundError>>>;
    assert.ok(result.ok);
    assert.equal(result.value.year, 1969);
    assert.equal(result.value.title, "A Wizard of Earthsea");
    assert.deepEqual(books.get("b2")?.tags, ["fantasy", "classic"]);
    assert.equal(earthsea.year, 1968, "the original object must not change");
  });

  test("reports a missing record", () => {
    const result = bookTable().update("b9", { year: 2000 });
    assert.ok(!result.ok);
    assert.ok(result.error instanceof NotFoundError);
    assert.equal(result.error.id, "b9");
  });

  test("finds records by any field", () => {
    const books = bookTable();
    const byLeGuin = books.where("author", "Ursula K. Le Guin");
    type _test = Expect<Equal<typeof byLeGuin, Book[]>>;
    // When the key is "year", the value must be a number.
    type _value = Expect<Equal<Parameters<typeof books.where<"year">>[1], number>>;
    assert.deepEqual(byLeGuin.map((book) => book.id), ["b2", "b3"]);
    assert.deepEqual(books.where("year", 1965).map((book) => book.id), ["b1"]);
  });

  test("works for any kind of record", () => {
    interface Author {
      id: string;
      name: string;
      country: string;
    }
    const authors = new Table<Author>();
    authors.insert({ id: "a1", name: "Ursula K. Le Guin", country: "US" });
    authors.insert({ id: "a2", name: "Stanisław Lem", country: "PL" });
    assert.deepEqual(
      authors.where("country", "PL").map((author) => author.name),
      ["Stanisław Lem"],
    );
  });
});

describe("parseNewBook", () => {
  test("accepts a valid body", () => {
    const body: unknown = JSON.parse(
      '{"title":"Kindred","author":"Octavia E. Butler","year":1979,"tags":["sci-fi"]}',
    );
    assert.deepEqual(parseNewBook(body), {
      ok: true,
      value: { title: "Kindred", author: "Octavia E. Butler", year: 1979, tags: ["sci-fi"] },
    });
  });

  test("keeps only the fields of a NewBook", () => {
    // A client must not choose the id, or slip in fields the shop doesn't know.
    const body: unknown = JSON.parse(
      '{"id":"b1","title":"Kindred","author":"Octavia E. Butler","year":1979,"price":0}',
    );
    assert.deepEqual(parseNewBook(body), {
      ok: true,
      value: { title: "Kindred", author: "Octavia E. Butler", year: 1979, tags: [] },
    });
  });

  test("tags default to an empty list", () => {
    const body: unknown = JSON.parse('{"title":"Solaris","author":"Stanisław Lem","year":1961}');
    assert.deepEqual(parseNewBook(body), {
      ok: true,
      value: { title: "Solaris", author: "Stanisław Lem", year: 1961, tags: [] },
    });
  });

  test("rejects invalid bodies with a message", () => {
    const valid = { title: "Kindred", author: "Octavia E. Butler", year: 1979 };
    const failures: [body: unknown, error: string][] = [
      ["Kindred", "body must be an object"],
      [null, "body must be an object"],
      [{ ...valid, title: "" }, "title must be a non-empty string"],
      [{ author: "Octavia E. Butler", year: 1979 }, "title must be a non-empty string"],
      [{ ...valid, author: 42 }, "author must be a non-empty string"],
      [{ ...valid, year: "1979" }, "year must be an integer"],
      [{ ...valid, year: 1979.5 }, "year must be an integer"],
      [{ ...valid, tags: ["sci-fi", 7] }, "tags must be an array of strings"],
      [{ ...valid, tags: "sci-fi" }, "tags must be an array of strings"],
    ];
    for (const [body, error] of failures) {
      assert.deepEqual(parseNewBook(body), { ok: false, error });
    }
  });
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<NewBook, { title: string; author: string; year: number; tags: readonly string[] }>>,
  Expect<Equal<Parameters<Table<Book>["update"]>[1], Partial<Omit<Book, "id">>>>,
];
