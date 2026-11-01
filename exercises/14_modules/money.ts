// Provided by tslings and restored before each check, so don't edit this file.
// Money helpers, shared by the exercises of this chapter.

export type Currency = "EUR" | "USD" | "GBP";

/** An amount in cents, so that sums never run into floating-point rounding. */
export interface Money {
  readonly cents: number;
  readonly currency: Currency;
}

export function money(cents: number, currency: Currency): Money {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Money is counted in whole cents, got ${cents}`);
  }
  return { cents, currency };
}

/**
 * Throws when two amounts use different currencies. It's exported so that the other modules
 * of the billing code can use it, not for the code that uses billing.
 */
export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Cannot combine ${a.currency} and ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function multiply(amount: Money, factor: number): Money {
  return money(Math.round(amount.cents * factor), amount.currency);
}

/** `format(money(1999, "EUR"))` is `"€19.99"`. */
export function format(amount: Money): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: amount.currency,
  });
  return formatter.format(amount.cents / 100);
}
