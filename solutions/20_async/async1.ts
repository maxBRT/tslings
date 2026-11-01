// An `async` function always returns a Promise, even when its body returns a plain value, so
// its return type is written `Promise<T>`. The type of an async function says so too: a loader
// that resolves to a profile has the type `(userId: string) => Promise<Profile>`.
//
// `await` unwraps a promise: if `p` is a `Promise<Profile>`, then `await p` is a `Profile`.
// Forget it, and you're holding the promise, not the profile.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { Equal, Expect } from "#type-assert";

type Subscription = "none" | "monthly" | "yearly";

const ACCOUNTS = new Map<string, { name: string; subscription: Subscription; lastSeen: string }>([
  ["u_42", { name: "Ada Lovelace", subscription: "yearly", lastSeen: "2026-10-30T18:12:00Z" }],
  ["u_7", { name: "Alan Turing", subscription: "none", lastSeen: "2026-09-02T07:45:00Z" }],
]);

// Imagine this comes from a third-party SDK: its return type is inferred, and not exported.
async function fetchProfile(userId: string) {
  await sleep(5); // the network
  const account = ACCOUNTS.get(userId);
  if (account === undefined) throw new Error(`No profile for ${userId}`);
  return {
    id: userId,
    displayName: account.name,
    subscription: account.subscription,
    lastSeen: new Date(account.lastSeen),
  };
}

// What `fetchProfile` resolves to, derived from it as in utility3.
type Profile = Awaited<ReturnType<typeof fetchProfile>>;

function isSubscriber(profile: Profile): boolean {
  return profile.subscription !== "none";
}

// `greet` receives the function that loads the profile, so a test or a cache can pass its own.
// `typeof fetchProfile` would also work as the type of `loadProfile`, but it ties `greet` to
// that one function's name and quirks. The function type says only what `greet` needs.
async function greet(
  userId: string,
  loadProfile: (userId: string) => Promise<Profile>,
): Promise<string> {
  const profile = await loadProfile(userId);
  const badge = isSubscriber(profile) ? ` (${profile.subscription} subscriber)` : "";
  return `Welcome back, ${profile.displayName}${badge}!`;
}

// Don't change the tests below.

// The app greets its users with the real loader.
const greetUser = (userId: string) => greet(userId, fetchProfile);

test("greets subscribers with their subscription", async () => {
  assert.equal(await greetUser("u_42"), "Welcome back, Ada Lovelace (yearly subscriber)!");
});

test("greets everyone else", async () => {
  assert.equal(await greetUser("u_7"), "Welcome back, Alan Turing!");
});

test("rejects for unknown users", async () => {
  await assert.rejects(async () => {
    await greetUser("u_0");
  }, /No profile for u_0/);
});

test("works with any async loader", async () => {
  const fromCache = async (userId: string): Promise<Profile> => ({
    id: userId,
    displayName: "Grace Hopper",
    subscription: "monthly",
    lastSeen: new Date("2026-10-31T09:00:00Z"),
  });
  assert.equal(await greet("u_1", fromCache), "Welcome back, Grace Hopper (monthly subscriber)!");
});

type _tests = [
  Expect<Equal<Parameters<typeof greet>[1], (userId: string) => Promise<Profile>>>,
  Expect<Equal<ReturnType<typeof greet>, Promise<string>>>,
];
