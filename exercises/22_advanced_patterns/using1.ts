// Some objects must be cleaned up after use: a database connection goes back to its pool, an
// unfinished transaction is rolled back. `try`/`finally` does it, but it's easy to forget, and
// it puts the cleanup far away from the line that took the resource.
//
// A `using` declaration ties the cleanup to the variable. When the block exits (normally, with
// `return`, or because something threw) JavaScript calls the value's `[Symbol.dispose]()`.
// `await using` does the same with `[Symbol.asyncDispose]()`, for cleanup that must be awaited.
// Several of them in one block are cleaned up in reverse order. TypeScript only lets you write
// `using` on a value that is `Disposable`; `await using` also accepts an `AsyncDisposable`.
// (`using` is recent JavaScript: Node.js runs it from version 24 on.)
//
// Make both classes disposable, then let `importOrders` roll back a failed import.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Row = { id: string; totalCents: number };

class Connection {
  readonly #log: string[];
  #released = false;

  constructor(log: string[]) {
    this.#log = log;
    log.push("connect");
  }

  query(sql: string): number {
    if (sql.startsWith("DROP")) throw new Error("permission denied");
    this.#log.push(`query ${sql}`);
    return 3;
  }

  async begin(): Promise<Transaction> {
    this.#log.push("begin");
    return new Transaction(this.#log);
  }

  release(): void {
    if (this.#released) return;
    this.#released = true;
    this.#log.push("release");
  }

  // TODO: Make `Connection` disposable: disposing a connection releases it.
}

class Transaction {
  readonly #log: string[];
  #finished = false;

  constructor(log: string[]) {
    this.#log = log;
  }

  async insert(row: Row): Promise<void> {
    if (row.totalCents < 0) throw new Error(`Invalid total for ${row.id}`);
    this.#log.push(`insert ${row.id}`);
  }

  async commit(): Promise<void> {
    this.#finished = true;
    this.#log.push("commit");
  }

  async rollback(): Promise<void> {
    this.#finished = true;
    this.#log.push("rollback");
  }

  // TODO: Make `Transaction` async-disposable: disposing one that is still unfinished rolls it
  // back.
}

function countOrders(log: string[], sql: string): number {
  using connection = new Connection(log);
  return connection.query(sql);
}

async function importOrders(log: string[], rows: readonly Row[]): Promise<void> {
  using connection = new Connection(log);
  // TODO: Declare the transaction so that a failed import is rolled back.
  const transaction = await connection.begin();
  for (const row of rows) await transaction.insert(row);
  await transaction.commit();
}

// Don't change the tests below.

test("the connection is released after the query", () => {
  const log: string[] = [];
  assert.equal(countOrders(log, "SELECT count(*) FROM orders"), 3);
  assert.deepEqual(log, ["connect", "query SELECT count(*) FROM orders", "release"]);
});

test("the connection is released when the query throws", () => {
  const log: string[] = [];
  assert.throws(() => countOrders(log, "DROP TABLE orders"), /permission denied/);
  assert.deepEqual(log, ["connect", "release"]);
});

test("a successful import is committed", async () => {
  const log: string[] = [];
  await importOrders(log, [{ id: "ord_1", totalCents: 1200 }]);
  assert.deepEqual(log, ["connect", "begin", "insert ord_1", "commit", "release"]);
});

test("a failed import is rolled back before the connection is released", async () => {
  const log: string[] = [];
  const rows = [
    { id: "ord_1", totalCents: 1200 },
    { id: "ord_2", totalCents: -5 },
  ];
  await assert.rejects(importOrders(log, rows), /Invalid total for ord_2/);
  assert.deepEqual(log, ["connect", "begin", "insert ord_1", "rollback", "release"]);
});

test("disposal runs in reverse order and only rolls back unfinished work", async () => {
  const log: string[] = [];
  {
    using connection = new Connection(log);
    await using committed = await connection.begin();
    await committed.commit();
    await using abandoned = await connection.begin();
  }
  assert.deepEqual(log, ["connect", "begin", "commit", "begin", "rollback", "release"]);
});

type _tests = [
  Expect<Equal<Connection extends Disposable ? true : false, true>>,
  Expect<Equal<Transaction extends AsyncDisposable ? true : false, true>>,
];
