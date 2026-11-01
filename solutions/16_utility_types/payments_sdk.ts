// Provided by tslings and restored before each check, so don't edit this file.
// A stand-in for a payments SDK installed from npm. Like many libraries, it
// exports its functions but not the types of their options or results.
// Pretend it lives in node_modules.

let chargeCount = 0;

export async function createCharge(
  amountCents: number,
  options: { currency: "EUR" | "USD"; customerId: string; description?: string },
) {
  chargeCount += 1;
  const status: "succeeded" | "requires_review" =
    amountCents > 100_000 ? "requires_review" : "succeeded";
  return {
    id: `ch_${chargeCount}`,
    amountCents,
    currency: options.currency,
    customerId: options.customerId,
    status,
    createdAt: new Date(),
  };
}
