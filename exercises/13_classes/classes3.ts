// `class FakeGateway implements PaymentGateway` asks TypeScript to check the class against the
// interface. A missing or mismatched member is then reported on the class itself, instead of
// wherever an instance is first used as a `PaymentGateway`.
//
// `implements` is only a check. It doesn't change the class's type, and it doesn't give the
// methods' parameters their types: you still annotate them yourself.
//
// The checkout depends on the `PaymentGateway` interface, not on a real payment provider, so
// the tests can use a fake one that records charges in memory. Finish `FakeGateway`.

import { test } from "node:test";
import assert from "node:assert/strict";

type Currency = "EUR" | "USD";

type Receipt = {
  readonly id: string;
  readonly amountCents: number;
  readonly currency: Currency;
};

interface PaymentGateway {
  readonly name: string;
  charge(amountCents: number, currency: Currency): Receipt;
  /** Refunds a charge. Returns `false` if there is no such charge (or it was refunded). */
  refund(receiptId: string): boolean;
}

class FakeGateway implements PaymentGateway {
  readonly name = "fake";
  readonly #receipts = new Map<string, Receipt>();
  #nextId = 1;

  // TODO: Fix this method's parameters.
  charge(amountCents, currency) {
    const receipt = { id: `rcpt_${this.#nextId}`, amountCents, currency };
    this.#nextId += 1;
    this.#receipts.set(receipt.id, receipt);
    return receipt;
  }

  // TODO: Add the missing method.

  get receipts(): Receipt[] {
    return [...this.#receipts.values()];
  }
}

function checkout(gateway: PaymentGateway, totalCents: number, currency: Currency): string {
  const receipt = gateway.charge(totalCents, currency);
  return `Paid ${totalCents / 100} ${currency} via ${gateway.name} (${receipt.id})`;
}

// Don't change the tests below.

test("charges through the gateway", () => {
  const gateway = new FakeGateway();
  assert.equal(checkout(gateway, 4200, "EUR"), "Paid 42 EUR via fake (rcpt_1)");
  assert.equal(checkout(gateway, 999, "USD"), "Paid 9.99 USD via fake (rcpt_2)");
  assert.deepEqual(gateway.receipts, [
    { id: "rcpt_1", amountCents: 4200, currency: "EUR" },
    { id: "rcpt_2", amountCents: 999, currency: "USD" },
  ]);
});

test("refunds a charge once", () => {
  const gateway: PaymentGateway = new FakeGateway();
  const { id } = gateway.charge(1500, "EUR");
  assert.equal(gateway.refund(id), true);
  assert.equal(gateway.refund(id), false);
  assert.equal(gateway.refund("rcpt_404"), false);
});

test("refunded charges are no longer listed", () => {
  const gateway = new FakeGateway();
  gateway.charge(100, "EUR");
  const { id } = gateway.charge(200, "EUR");
  gateway.refund(id);
  assert.deepEqual(gateway.receipts, [{ id: "rcpt_1", amountCents: 100, currency: "EUR" }]);
});
