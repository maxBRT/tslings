// In TypeScript, a class declares its fields with their types, in the class body. With
// `strict` (`strictPropertyInitialization`), every field must get a value, either right where
// it's declared (`count = 0`) or in the constructor. TypeScript then guarantees that no
// instance ever has a field left `undefined` by mistake.
//
// `readonly` fields can only be set in their declaration or in the constructor. Use it for
// settings that must not change once the object exists.
//
// `RateLimiter` allows at most `maxRequests` requests per sliding time window. Fix its field
// declarations: make every field initialized, and make the two settings `readonly`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

class RateLimiter {
  readonly maxRequests: number;
  readonly windowMs: number;
  // Initialized where it's declared: every limiter starts with an empty history. A field
  // declared as `requestTimes!: number[]` would silence the error, and crash at runtime.
  requestTimes: number[] = [];

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Records a request made at `now` (in milliseconds) and says whether it's allowed. */
  allow(now: number): boolean {
    const recent = this.requestTimes.filter((time) => now - time < this.windowMs);
    if (recent.length >= this.maxRequests) {
      this.requestTimes = recent;
      return false;
    }
    this.requestTimes = [...recent, now];
    return true;
  }
}

// Don't change the tests below.

test("allows requests up to the limit", () => {
  const limiter = new RateLimiter(3, 1000);
  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(100), true);
  assert.equal(limiter.allow(200), true);
  assert.equal(limiter.allow(300), false);
});

test("allows requests again once old ones leave the window", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(500), true);
  assert.equal(limiter.allow(900), false);
  assert.equal(limiter.allow(1000), true);
  assert.equal(limiter.allow(1200), false);
  assert.equal(limiter.allow(1500), true);
});

test("the window length comes from the constructor", () => {
  const limiter = new RateLimiter(1, 60_000);
  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(30_000), false);
  assert.equal(limiter.allow(60_000), true);
});

test("each limiter has its own history", () => {
  const api = new RateLimiter(1, 1000);
  const login = new RateLimiter(1, 1000);
  assert.equal(api.allow(0), true);
  assert.equal(login.allow(0), true);
  assert.equal(api.allow(10), false);
});

type _tests = [
  Expect<
    Equal<
      Pick<RateLimiter, "maxRequests" | "windowMs">,
      { readonly maxRequests: number; readonly windowMs: number }
    >
  >,
];
