// `Promise.all` waits for several promises at once, so independent requests run at the same
// time instead of one after the other. Give it an array literal and TypeScript types the
// result as a tuple, with one type per position:
//
//   const [user, orders] = await Promise.all([fetchUser(id), fetchOrders(id)]);
//   //     ^ User  ^ Order[]
//
// Put the promises in a variable first, and that precision is gone. TypeScript infers an
// array type, `(Promise<User> | Promise<Order[]>)[]`: any number of elements, each of which
// is "a user or some orders".
//
// TODO: Make `loadDashboard` compile, keeping the three requests running at the same time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

interface Account {
  readonly id: string;
  readonly name: string;
}

interface Order {
  readonly id: string;
  readonly status: "open" | "shipped" | "cancelled";
}

interface Dashboard {
  readonly greeting: string;
  readonly openOrders: number;
  readonly unread: number;
}

// A fake API. `network` counts the requests in flight, to check that they overlap.
const network = { inFlight: 0, maxInFlight: 0 };

async function request<T>(response: T): Promise<T> {
  network.inFlight++;
  network.maxInFlight = Math.max(network.maxInFlight, network.inFlight);
  await sleep(10);
  network.inFlight--;
  return response;
}

function fetchAccount(userId: string): Promise<Account> {
  return request({ id: userId, name: "Grace Hopper" });
}

function fetchOrders(userId: string): Promise<Order[]> {
  return request([
    { id: `${userId}-1`, status: "open" },
    { id: `${userId}-2`, status: "shipped" },
    { id: `${userId}-3`, status: "open" },
  ]);
}

function fetchUnreadCount(userId: string): Promise<number> {
  return request(userId.length);
}

async function loadDashboard(userId: string): Promise<Dashboard> {
  const requests = [fetchAccount(userId), fetchOrders(userId), fetchUnreadCount(userId)];
  const [account, orders, unread] = await Promise.all(requests);
  return {
    greeting: `Hello, ${account.name}`,
    openOrders: orders.filter((order) => order.status === "open").length,
    unread,
  };
}

// Don't change the tests below.

test("builds the dashboard", async () => {
  assert.deepEqual(await loadDashboard("u_17"), {
    greeting: "Hello, Grace Hopper",
    openOrders: 2,
    unread: 4,
  });
});

test("sends the three requests at the same time", async () => {
  network.maxInFlight = 0;
  await loadDashboard("u_17");
  assert.equal(
    network.maxInFlight,
    3,
    "the requests ran one after the other: start them all before awaiting",
  );
});
