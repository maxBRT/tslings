// APIs return long lists one page at a time: `{ items, nextCursor }`. An async generator
// turns "fetch a page, yield its items, follow the cursor" into a single stream of items:
//
//   async function* allItems(): AsyncGenerator<Item, void, undefined> { ... yield item; ... }
//
// The three type arguments are what it yields, what it returns and what `next()` takes. Write
// all three: the last two default to `any`.
//
// Read it with `for await (const item of allItems())`. Pages are only fetched when the loop
// asks for more items, so a loop that stops early (`break`, `return`) also stops fetching.
// `Array.fromAsync(stream)` collects a whole stream into an array.
//
// TODO: Turn `allCustomers` into an async generator that yields customers page by page.
// `findByEmail` and `exportEmails` are already written for that; don't change them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { Equal, Expect } from "#type-assert";

interface Customer {
  readonly id: string;
  readonly email: string;
}

interface Page<T> {
  readonly items: readonly T[];
  /** Only present when there are more pages. */
  readonly nextCursor?: string;
}

const PAGE_SIZE = 3;

/** A fake API with `count` customers, that counts the requests it gets. */
class CustomersApi {
  requests = 0;
  readonly #customers: readonly Customer[];

  constructor(count: number) {
    this.#customers = Array.from({ length: count }, (_, i) => ({
      id: `cus_${i + 1}`,
      email: `customer${i + 1}@example.com`,
    }));
  }

  async listCustomers(cursor?: string): Promise<Page<Customer>> {
    this.requests++;
    await sleep(2);
    const start = cursor === undefined ? 0 : Number(cursor);
    const end = start + PAGE_SIZE;
    const items = this.#customers.slice(start, end);
    return end < this.#customers.length ? { items, nextCursor: String(end) } : { items };
  }
}

async function allCustomers(api: CustomersApi): Promise<Customer[]> {
  const customers: Customer[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.listCustomers(cursor);
    customers.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== undefined);
  return customers;
}

async function findByEmail(api: CustomersApi, email: string): Promise<Customer | undefined> {
  for await (const customer of allCustomers(api)) {
    if (customer.email === email) return customer;
  }
  return undefined;
}

function exportEmails(api: CustomersApi): Promise<string[]> {
  return Array.fromAsync(allCustomers(api), (customer) => customer.email);
}

// Don't change the tests below.

test("finds a customer without fetching every page", async () => {
  const api = new CustomersApi(10);
  assert.deepEqual(await findByEmail(api, "customer5@example.com"), {
    id: "cus_5",
    email: "customer5@example.com",
  });
  assert.equal(api.requests, 2, "customer 5 is on page 2, but more pages were fetched");
});

test("returns undefined after the last page", async () => {
  const api = new CustomersApi(10);
  assert.equal(await findByEmail(api, "nobody@example.com"), undefined);
  assert.equal(api.requests, 4);
});

test("exports every email", async () => {
  const api = new CustomersApi(7);
  const emails = await exportEmails(api);
  assert.equal(emails.length, 7);
  assert.equal(emails.at(-1), "customer7@example.com");
  assert.equal(api.requests, 3);
});

test("fetches nothing until someone reads the stream", async () => {
  const api = new CustomersApi(10);
  const stream = allCustomers(api);
  assert.equal(api.requests, 0, "a page was fetched before anyone asked for a customer");
  for await (const customer of stream) {
    assert.equal(customer.id, "cus_1");
    break;
  }
  assert.equal(api.requests, 1, "reading the first customer fetched more than the first page");
});

type ItemOf<T> = T extends AsyncIterable<infer Item> ? Item : never;

type _tests = [Expect<Equal<ItemOf<ReturnType<typeof allCustomers>>, Customer>>];
