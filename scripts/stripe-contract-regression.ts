import assert from "node:assert/strict";

import { PaymentEventPayloadSchema, processPaymentEvent, validateStripeTestCheckoutContract } from "../src/lib/payment-events";
import { StripeCheckoutMetadataSchema } from "../src/lib/payment-contract";
import { liveMutationFlags } from "../src/lib/safety";
import { createManualDdpQuote, createOrderQuoteFingerprint } from "../src/lib/route-quote";

const now = new Date("2026-05-11T00:00:00.000Z");
const sourceOrderKey = "pm:77777777-7777-4777-8777-777777777777";
const quoteId = "99999999-9999-4999-8999-999999999999";
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey,
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const quote = createManualDdpQuote({
  orderId: "88888888-8888-4888-8888-888888888888",
  currency: "USD",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now,
  amountCents: 5000,
});
const metadata = StripeCheckoutMetadataSchema.parse({
  fulfillment_order_id: quote.orderId,
  fulfillment_quote_id: quoteId,
  source_order_key: sourceOrderKey,
  quote_fingerprint: fingerprint,
  amount_cents: String(quote.totalCents),
  currency: quote.currency,
  environment: "test",
});
const session = {
  id: "cs_test_contract_001",
  amount_total: quote.totalCents,
  currency: "usd",
  livemode: false,
  mode: "payment",
  payment_status: "paid",
  metadata,
};

assert.equal(liveMutationFlags({ FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "false" }).FULFILLMENT_ENABLE_STRIPE_CHECKOUT, false);

const ready = validateStripeTestCheckoutContract({
  session,
  quoteId,
  quote,
  sourceOrderKey,
  currentOrderFingerprint: fingerprint,
  now,
  stripeMode: "test",
});

assert.equal(ready.ok, true);

if (!ready.ok) {
  throw new Error("Stripe test contract should be ready.");
}

const payload = PaymentEventPayloadSchema.parse(ready.paymentPayload);
const accepted = processPaymentEvent(payload, { seenEventKeys: new Set() });
assert.equal(accepted.lockApplied, true);
assert.equal(accepted.orderStatus, "locked_for_fulfillment");

const liveModeBlocked = validateStripeTestCheckoutContract({
  session: { ...session, livemode: true },
  quoteId,
  quote,
  sourceOrderKey,
  currentOrderFingerprint: fingerprint,
  now,
  stripeMode: "live",
});
assert.equal(liveModeBlocked.ok, false);
assert.equal(liveModeBlocked.code, "stripe_live_mode_blocked");

const amountMismatch = validateStripeTestCheckoutContract({
  session: { ...session, amount_total: quote.totalCents + 1 },
  quoteId,
  quote,
  sourceOrderKey,
  currentOrderFingerprint: fingerprint,
  now,
  stripeMode: "test",
});
assert.equal(amountMismatch.ok, false);
assert.equal(amountMismatch.code, "stripe_amount_mismatch");

const metadataMismatch = validateStripeTestCheckoutContract({
  session: {
    ...session,
    metadata: {
      ...metadata,
      quote_fingerprint: "changed",
    },
  },
  quoteId,
  quote,
  sourceOrderKey,
  currentOrderFingerprint: fingerprint,
  now,
  stripeMode: "test",
});
assert.equal(metadataMismatch.ok, false);
assert.equal(metadataMismatch.code, "stripe_metadata_mismatch");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "stripe-contract",
      normalizedEvent: payload.eventType,
      lockStatus: accepted.orderStatus,
      mode: "synthetic-test-only",
    },
    null,
    2,
  ),
);
