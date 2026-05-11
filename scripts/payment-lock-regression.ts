import assert from "node:assert/strict";

import {
  PaymentEventPayloadSchema,
  processPaymentEvent,
  signPaymentEventPayload,
  verifyPaymentEventSignature,
  type PaymentEventPayload,
} from "../src/lib/payment-events";
import { createManualDdpQuote, createOrderQuoteFingerprint } from "../src/lib/route-quote";

const now = "2026-05-11T00:00:00.000Z";
const sourceOrderKey = "pm:55555555-5555-4555-8555-555555555555";
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey,
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const quote = createManualDdpQuote({
  orderId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  currency: "USD",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now: new Date(now),
  amountCents: 5000,
});

const payload: PaymentEventPayload = {
  eventId: "evt_synthetic_001",
  eventType: "stripe.checkout.session.completed",
  orderId: quote.orderId,
  quoteId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  sourceOrderKey,
  amountCents: quote.totalCents,
  currency: quote.currency,
  orderStatusBefore: "payment_pending",
  decisionStatusBefore: "payment_pending",
  quote: {
    ...quote,
    expiresAt: quote.expiresAt.toISOString(),
  },
  currentOrderFingerprint: fingerprint,
  now,
};

const rawBody = JSON.stringify(payload);
const signature = signPaymentEventPayload(rawBody, "synthetic-payment-secret");

assert.equal(verifyPaymentEventSignature(rawBody, signature, "synthetic-payment-secret"), true);
assert.equal(verifyPaymentEventSignature(rawBody, signature, "wrong-secret"), false);

const parsed = PaymentEventPayloadSchema.parse(payload);
const seenEventKeys = new Set<string>();
const accepted = processPaymentEvent(parsed, { seenEventKeys });

assert.deepEqual(accepted, {
  eventStatus: "accepted",
  lockApplied: true,
  orderStatus: "locked_for_fulfillment",
  decisionStatus: "paid_locked",
  issues: [],
});

const duplicate = processPaymentEvent(parsed, { seenEventKeys });
assert.equal(duplicate.eventStatus, "duplicate");
assert.equal(duplicate.lockApplied, false);

const amountMismatch = processPaymentEvent(
  {
    ...parsed,
    eventId: "evt_synthetic_002",
    amountCents: parsed.amountCents + 1,
  },
  { seenEventKeys },
);

assert.equal(amountMismatch.eventStatus, "mismatch");
assert.equal(amountMismatch.lockApplied, false);
assert.equal(amountMismatch.issues[0]?.code, "payment_review_required");

const staleQuote = processPaymentEvent(
  {
    ...parsed,
    eventId: "evt_synthetic_003",
    now: "2026-05-12T00:00:00.000Z",
  },
  { seenEventKeys },
);

assert.equal(staleQuote.eventStatus, "mismatch");
assert.equal(staleQuote.lockApplied, false);
assert.equal(staleQuote.issues[0]?.code, "payment_review_required");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "payment-lock",
      acceptedStatus: accepted.orderStatus,
      duplicateStatus: duplicate.eventStatus,
      mismatchIssue: amountMismatch.issues[0]?.code,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
