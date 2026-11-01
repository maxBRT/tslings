// The most common async bug is a missing `await`. TypeScript catches some of them, like a
// promise used as if it were its value: `if (isBlocked(id))`, where `isBlocked` is async,
// tests the Promise object, which is always truthy.
//
// Two others compile fine, so you have to learn to spot them:
// - `return task();` inside a `try`. The function hands back the promise before it has
//   failed, so the `catch` never runs. Write `return await task();`.
// - A "floating" promise: an async call that nobody awaits. The caller moves on before the
//   work is done, and if it fails, nothing handles the error. (typescript-eslint's
//   `no-floating-promises` rule reports these.)
//
// TODO: Find the three missing `await`s in `withRetry` and `checkout`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

class HttpError extends Error {
  override readonly name = "HttpError";
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** A fake payment gateway that answers 503 to its first `outages` calls. */
class FakeGateway {
  calls = 0;
  readonly #outages: number;

  constructor(outages: number) {
    this.#outages = outages;
  }

  async charge(cents: number): Promise<string> {
    this.calls++;
    await sleep(1);
    if (this.calls <= this.#outages) throw new HttpError(503, "Service unavailable");
    if (cents > 100_000) throw new HttpError(402, "Card declined");
    return `ch_${this.calls}_${cents}`;
  }
}

class AuditLog {
  readonly entries: string[] = [];

  async record(entry: string): Promise<void> {
    await sleep(1); // a database write
    this.entries.push(entry);
  }
}

const BLOCKED_CUSTOMERS = new Set(["cus_fraud"]);

async function isBlocked(customerId: string): Promise<boolean> {
  await sleep(1); // a call to the risk service
  return BLOCKED_CUSTOMERS.has(customerId);
}

function isRetryable(error: unknown): boolean {
  return error instanceof HttpError && error.status >= 500;
}

async function withRetry<T>(task: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return task();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      lastError = error;
    }
  }
  throw new Error(`Gave up after ${attempts} attempts`, { cause: lastError });
}

interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly totalCents: number;
}

async function checkout(order: Order, gateway: FakeGateway, audit: AuditLog): Promise<string> {
  if (isBlocked(order.customerId)) {
    throw new Error(`Customer ${order.customerId} is blocked`);
  }
  const chargeId = await withRetry(() => gateway.charge(order.totalCents), 3);
  audit.record(`${order.id} charged ${order.totalCents} (${chargeId})`);
  return chargeId;
}

// Don't change the tests below.

const order = (id: string, customerId: string, totalCents: number): Order => ({
  id,
  customerId,
  totalCents,
});

test("charges the order", async () => {
  const gateway = new FakeGateway(0);
  const chargeId = await checkout(order("ord_1", "cus_1", 4_500), gateway, new AuditLog());
  assert.equal(chargeId, "ch_1_4500");
});

test("refuses blocked customers before charging them", async () => {
  const gateway = new FakeGateway(0);
  await assert.rejects(checkout(order("ord_2", "cus_fraud", 100), gateway, new AuditLog()), {
    message: "Customer cus_fraud is blocked",
  });
  assert.equal(gateway.calls, 0);
});

test("retries while the gateway is down", async () => {
  const gateway = new FakeGateway(2);
  assert.equal(await withRetry(() => gateway.charge(1_000), 3), "ch_3_1000");
  assert.equal(gateway.calls, 3);
});

test("gives up after the last attempt, keeping the last error as the cause", async () => {
  const gateway = new FakeGateway(5);
  await assert.rejects(withRetry(() => gateway.charge(1_000), 3), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(
      error.message,
      "Gave up after 3 attempts",
      `withRetry let "${error.message}" through instead of retrying. Did its catch block run?`,
    );
    assert.ok(error.cause instanceof HttpError);
    return true;
  });
  assert.equal(gateway.calls, 3);
});

test("doesn't retry a declined card", async () => {
  const gateway = new FakeGateway(0);
  await assert.rejects(withRetry(() => gateway.charge(200_000), 3), { status: 402 });
  assert.equal(gateway.calls, 1);
});

test("saves the audit entry before checkout resolves", async () => {
  const audit = new AuditLog();
  await checkout(order("ord_3", "cus_1", 990), new FakeGateway(0), audit);
  assert.deepEqual(
    audit.entries,
    ["ord_3 charged 990 (ch_1_990)"],
    "checkout resolved before the audit entry was saved",
  );
});
