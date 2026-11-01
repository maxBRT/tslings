// `for...of`, spread (`[...x]`), `Array.from(x)` and destructuring all use the same protocol:
// they call `x[Symbol.iterator]()` and pull values from the iterator it returns, until it
// says it's done. TypeScript calls such a value an `Iterable<T>`: any object with a
// `[Symbol.iterator]()` method that returns an `Iterator<T>`.
//
// The easy way to write that method is as a generator: put a `*` before its name and
// `yield` each value. TypeScript infers the element type from what you yield.
//
//   *[Symbol.iterator]() { yield "a"; yield "b"; }
//
// TODO: Make `Stay` iterable. It yields one `Date` per night of the stay, from the check-in
// day up to (not including) the check-out day.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** A hotel booking. Dates are midnight UTC. */
class Stay implements Iterable<Date> {
  readonly checkIn: Date;
  readonly checkOut: Date;

  constructor(checkIn: Date, checkOut: Date) {
    if (checkOut <= checkIn) {
      throw new RangeError("Check-out must be after check-in");
    }
    this.checkIn = checkIn;
    this.checkOut = checkOut;
  }
}

/** Friday and Saturday nights cost the weekend rate. */
function totalPrice(stay: Stay, weeknightRate: number, weekendRate: number): number {
  let total = 0;
  for (const night of stay) {
    const weekday = night.getUTCDay();
    total += weekday === 5 || weekday === 6 ? weekendRate : weeknightRate;
  }
  return total;
}

// Don't change the tests below.

const day = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);
const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

test("yields every night of the stay", () => {
  const stay = new Stay(day("2026-11-05"), day("2026-11-09"));
  const nights = [...stay];
  type _nights = Expect<Equal<typeof nights, Date[]>>;
  assert.deepEqual(nights.map(isoDay), ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
});

test("works across months and years", () => {
  const stay = new Stay(day("2026-12-30"), day("2027-01-02"));
  assert.deepEqual(Array.from(stay, isoDay), ["2026-12-30", "2026-12-31", "2027-01-01"]);
});

test("prices weeknights and weekend nights", () => {
  assert.equal(totalPrice(new Stay(day("2026-11-05"), day("2026-11-09")), 100, 150), 500);
  assert.equal(totalPrice(new Stay(day("2026-12-30"), day("2027-01-02")), 100, 150), 350);
});

test("can be iterated more than once", () => {
  const stay = new Stay(day("2026-11-05"), day("2026-11-07"));
  const [firstNight] = stay;
  assert.equal(firstNight?.getTime(), stay.checkIn.getTime());
  assert.equal([...stay].length, 2);
  assert.equal([...stay].length, 2, "the second loop over the stay found no nights");
});

type _tests = [Expect<Equal<Stay extends Iterable<infer Night> ? Night : never, Date>>];
