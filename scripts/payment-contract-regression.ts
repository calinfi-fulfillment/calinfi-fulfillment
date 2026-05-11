import assert from "node:assert/strict";

import { StripeCheckoutMetadataSchema } from "../src/lib/payment-contract";
import { createManualDdpQuote, createOrderQuoteFingerprint, validateFreshQuoteForPayment } from "../src/lib/route-quote";

const now = new Date("2026-05-11T00:00:00.000Z");
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey: "pm:44444444-4444-4444-8444-444444444444",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});

const quote = createManualDdpQuote({
  orderId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  currency: "USD",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now,
  amountCents: 5000,
});

assert.equal(validateFreshQuoteForPayment(quote, now, fingerprint).ok, true);
assert.equal(validateFreshQuoteForPayment(quote, new Date("2026-05-12T00:00:00.000Z"), fingerprint).reason, "quote_expired");
assert.equal(validateFreshQuoteForPayment(quote, now, "changed").reason, "order_changed");

const metadata = StripeCheckoutMetadataSchema.parse({
  fulfillment_order_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  fulfillment_quote_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  source_order_key: "pm:44444444-4444-4444-8444-444444444444",
  quote_fingerprint: fingerprint,
  amount_cents: String(quote.totalCents),
  currency: "USD",
  environment: "test",
});

assert.equal(metadata.environment, "test");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "payment-contract",
      freshReason: validateFreshQuoteForPayment(quote, now, fingerprint).reason,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
