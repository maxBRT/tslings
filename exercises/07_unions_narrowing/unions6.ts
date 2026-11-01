// Narrowing doesn't always reach inside callbacks: a callback can run later,
// when a `let` variable may hold something else. Since TypeScript 5.4, a `let`
// that's never assigned after the callback is created keeps its narrowing, but
// `currentUser` is reassigned in `logIn` and `logOut`, which can run at any time.
// A `const` can't change: copy the value into one, check the const, and the
// callback keeps the narrowed type.
//
// This app queues emails and builds them later, when `flushOutbox` runs. Make
// `queueWelcomeEmail` compile, and make sure each email goes to the person who
// was logged in when it was queued.

import { test } from "node:test";
import assert from "node:assert/strict";

type User = { name: string; email: string };

let currentUser: User | undefined;

function logIn(user: User): void {
  currentUser = user;
}

function logOut(): void {
  currentUser = undefined;
}

// Each entry builds one email when the outbox is flushed.
const outbox: Array<() => string> = [];

function flushOutbox(): string[] {
  return outbox.splice(0).map((buildEmail) => buildEmail());
}

function queueWelcomeEmail(): boolean {
  // TODO: TypeScript doesn't trust this check inside the callback below, and
  // it's right: `logOut` may run before the email is built.
  if (currentUser === undefined) {
    return false;
  }
  outbox.push(() => `To: ${currentUser.email} | Welcome back, ${currentUser.name}!`);
  return true;
}

// Don't change the tests below.

const ada: User = { name: "Ada", email: "ada@example.com" };
const grace: User = { name: "Grace", email: "grace@example.com" };

test("nothing to send when nobody is logged in", () => {
  logOut();
  assert.equal(queueWelcomeEmail(), false);
  assert.deepEqual(flushOutbox(), []);
});

test("the email goes to whoever was logged in when it was queued", () => {
  logIn(ada);
  assert.equal(queueWelcomeEmail(), true);
  logIn(grace);
  assert.deepEqual(flushOutbox(), ["To: ada@example.com | Welcome back, Ada!"]);
});

test("logging out before the outbox is flushed", () => {
  logIn(grace);
  queueWelcomeEmail();
  logOut();
  assert.deepEqual(flushOutbox(), ["To: grace@example.com | Welcome back, Grace!"]);
});
