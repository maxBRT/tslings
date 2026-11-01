// An `async` function always returns a Promise, even when its body returns a plain value, so
// its return type is written `Promise<T>`. `await` unwraps a promise: if `p` is a
// `Promise<Profile>`, then `await p` is a `Profile`.
//
// `Awaited<T>` does the same for types: `Awaited<Promise<Profile>>` is `Profile`. Combined
// with `ReturnType`, it names what an async function resolves to. That's how you get at the
// response types of SDKs that don't export them, like `fetchProfile` below.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { Equal, Expect } from "#type-assert";

type Plan = "free" | "pro" | "team";

const ACCOUNTS = new Map<string, { name: string; plan: Plan; lastSeen: string }>([
  ["u_42", { name: "Ada Lovelace", plan: "pro", lastSeen: "2026-10-30T18:12:00Z" }],
  ["u_7", { name: "Alan Turing", plan: "free", lastSeen: "2026-09-02T07:45:00Z" }],
]);

// Imagine this comes from a third-party SDK: its return type is inferred, and not exported.
async function fetchProfile(userId: string) {
  await sleep(5); // the network
  const account = ACCOUNTS.get(userId);
  if (account === undefined) throw new Error(`No profile for ${userId}`);
  return {
    id: userId,
    displayName: account.name,
    plan: account.plan,
    lastSeen: new Date(account.lastSeen),
  };
}

// `ReturnType<typeof fetchProfile>` is `Promise<{ id: string; ... }>`; `Awaited` unwraps it.
// If the SDK adds a field, `Profile` picks it up without anyone editing this line.
type Profile = Awaited<ReturnType<typeof fetchProfile>>;

function isPaying(profile: Profile): boolean {
  return profile.plan !== "free";
}

async function greet(userId: string): Promise<string> {
  const profile = await fetchProfile(userId);
  const badge = isPaying(profile) ? ` (${profile.plan})` : "";
  return `Welcome back, ${profile.displayName}${badge}!`;
}

// Don't change the tests below.

test("greets paying users with their plan", async () => {
  assert.equal(await greet("u_42"), "Welcome back, Ada Lovelace (pro)!");
});

test("greets free users", async () => {
  assert.equal(await greet("u_7"), "Welcome back, Alan Turing!");
});

test("rejects for unknown users", async () => {
  await assert.rejects(async () => {
    await greet("u_0");
  }, /No profile for u_0/);
});

type _tests = [
  Expect<Equal<Profile, { id: string; displayName: string; plan: Plan; lastSeen: Date }>>,
  Expect<Equal<ReturnType<typeof greet>, Promise<string>>>,
];
