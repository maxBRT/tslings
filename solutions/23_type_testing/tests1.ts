// You've been reading `node:test` tests since the first exercise. Now you write them.
//
// `describe` groups tests and `it` declares one. Assertions come from `node:assert/strict`:
// `assert.equal` compares like `===` (with `Object.is`), `assert.deepEqual` compares objects
// and arrays by content, and `await assert.rejects(promise)` expects the promise to fail.
// `mock.fn(fake)` creates a function that behaves like `fake` and records every call in its
// `.mock` property. That's how you replace a dependency, like a network call, and check how the
// code used it.
//
// A test is only worth something if it fails when the code is wrong. The tests at the bottom run
// your checks against the real converter, where they must pass, and against broken copies of it,
// where they must fail.

import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

type Price = { cents: number; currency: string };
type FetchRate = (currency: string) => Promise<number>;
type Convert = (euroCents: number, currency: string) => Promise<Price>;

// Converts euro amounts to other currencies. Each exchange rate is fetched once, then cached.
function createConverter(fetchRate: FetchRate): Convert {
  const rates = new Map<string, number>();
  return async (euroCents, currency) => {
    if (!Number.isInteger(euroCents) || euroCents < 0) {
      throw new RangeError(`Invalid amount: ${euroCents}`);
    }
    let rate = rates.get(currency);
    if (rate === undefined) {
      rate = await fetchRate(currency);
      rates.set(currency, rate);
    }
    return { cents: Math.round(euroCents * rate), currency };
  };
}

async function checkConverter(create: typeof createConverter): Promise<void> {
  // The type argument makes the mock a `FetchRate`, so `mock.calls[0]?.arguments` is typed
  // `[currency: string]`. A rate of 1 would hide the "wrong way" bug: 1 / 1 is still 1.
  const fetchRate = mock.fn<FetchRate>(async () => 1.1);
  const convert = create(fetchRate);

  assert.deepEqual(await convert(1000, "USD"), { cents: 1100, currency: "USD" });

  assert.deepEqual(await convert(250, "USD"), { cents: 275, currency: "USD" });
  assert.equal(fetchRate.mock.callCount(), 1);
  assert.deepEqual(fetchRate.mock.calls[0]?.arguments, ["USD"]);

  // Pass the promise itself (or an async function) to `assert.rejects`, and `await` the result:
  // an assertion that isn't awaited can't fail the test.
  await assert.rejects(convert(-5, "USD"), RangeError);
}

// Don't change the tests below.

// Each of these has exactly one bug. Read them to see what your checks must notice.
const brokenConverters: Record<string, typeof createConverter> = {
  "converts the wrong way": (fetchRate) => {
    return createConverter(async (currency) => 1 / (await fetchRate(currency)));
  },
  "returns the wrong currency": (fetchRate) => {
    const convert = createConverter(fetchRate);
    return async (cents, currency) => ({ ...(await convert(cents, currency)), currency: "EUR" });
  },
  "fetches the rate on every call": (fetchRate) => {
    return (cents, currency) => createConverter(fetchRate)(cents, currency);
  },
  "asks for the rate in lowercase": (fetchRate) => {
    return createConverter((currency) => fetchRate(currency.toLowerCase()));
  },
  "accepts negative amounts": (fetchRate) => {
    const convert = createConverter(fetchRate);
    return (cents, currency) => convert(Math.abs(cents), currency);
  },
};

describe("checkConverter", () => {
  it("passes on the real converter", async () => {
    await checkConverter((fetchRate) => createConverter(fetchRate));
  });

  for (const [bug, broken] of Object.entries(brokenConverters)) {
    it(`fails on a converter that ${bug}`, async () => {
      await assert.rejects(
        checkConverter(broken),
        assert.AssertionError,
        `Your checks passed on a converter that ${bug}. Add an assertion that catches it.`,
      );
    });
  }
});
