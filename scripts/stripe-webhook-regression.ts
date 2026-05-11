import assert from "node:assert/strict";
import type { NextRequest } from "next/server";

import { POST as stripeWebhookRoute } from "../src/app/api/stripe/webhook/route";
import { StripeCheckoutMetadataSchema } from "../src/lib/payment-contract";
import { createManualDdpQuote, createOrderQuoteFingerprint } from "../src/lib/route-quote";
import { createSyntheticStripeSignatureHeader, verifyAndHandleStripeTestWebhook } from "../src/lib/stripe-webhook";

const now = new Date("2026-05-12T00:00:00.000Z");
const timestamp = Math.floor(Date.now() / 1000);
const webhookSecret = ["wh", "sec", "_synthetic_webhook"].join("");
const sourceOrderKey = "pm:12121212-1212-4121-8121-121212121212";
const quoteId = "34343434-3434-4434-8434-343434343434";
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey,
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const quote = createManualDdpQuote({
  orderId: "56565656-5656-4565-8565-565656565656",
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

function eventBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_test_webhook_001",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test_webhook_001",
        amount_total: quote.totalCents,
        currency: "usd",
        livemode: false,
        metadata,
        mode: "payment",
        payment_status: "paid",
        ...overrides,
      },
    },
  });
}

function signature(rawBody: string) {
  return createSyntheticStripeSignatureHeader({
    rawBody,
    secret: webhookSecret,
    timestamp,
  });
}

async function main() {
  const rawBody = eventBody();
  const signedHeader = signature(rawBody);
  const seenEventKeys = new Set<string>();
  const processed = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: signedHeader,
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    quoteContext: {
      quoteId,
      quote,
      sourceOrderKey,
      currentOrderFingerprint: fingerprint,
      now,
    },
    paymentContext: { seenEventKeys },
    nowSeconds: timestamp,
  });

  assert.equal(processed.ok, true);
  assert.equal(processed.code, "stripe_webhook_payment_processed");

  if (!processed.ok || processed.code !== "stripe_webhook_payment_processed") {
    throw new Error("Expected Stripe webhook to process.");
  }

  assert.equal(processed.payment.lockApplied, true);
  assert.equal(processed.payment.orderStatus, "locked_for_fulfillment");

  const duplicate = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: signedHeader,
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    quoteContext: {
      quoteId,
      quote,
      sourceOrderKey,
      currentOrderFingerprint: fingerprint,
      now,
    },
    paymentContext: { seenEventKeys },
    nowSeconds: timestamp,
  });
  assert.equal(duplicate.ok, true);

  if (!duplicate.ok || duplicate.code !== "stripe_webhook_payment_processed") {
    throw new Error("Expected duplicate Stripe webhook to normalize.");
  }

  assert.equal(duplicate.payment.eventStatus, "duplicate");

  const invalidSignature = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: `t=${timestamp},v1=bad`,
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    nowSeconds: timestamp,
  });
  assert.equal(invalidSignature.ok, false);
  assert.equal(invalidSignature.code, "stripe_signature_invalid");

  const staleSignature = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: signedHeader,
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    nowSeconds: timestamp + 301,
  });
  assert.equal(staleSignature.ok, false);
  assert.equal(staleSignature.code, "stripe_signature_stale");

  const mismatchBody = eventBody({ amount_total: quote.totalCents + 1 });
  const amountMismatch = verifyAndHandleStripeTestWebhook({
    rawBody: mismatchBody,
    signatureHeader: signature(mismatchBody),
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    quoteContext: {
      quoteId,
      quote,
      sourceOrderKey,
      currentOrderFingerprint: fingerprint,
      now,
    },
    nowSeconds: timestamp,
  });
  assert.equal(amountMismatch.ok, false);
  assert.equal(amountMismatch.code, "stripe_test_contract_failed");

  const liveMode = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: signedHeader,
    env: {
      STRIPE_MODE: "live",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
    nowSeconds: timestamp,
  });
  assert.equal(liveMode.ok, false);
  assert.equal(liveMode.code, "stripe_live_mode_blocked");

  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalMode = process.env.STRIPE_MODE;
  process.env["STRIPE_WEBHOOK_SECRET"] = webhookSecret;
  process.env.STRIPE_MODE = "test";

  try {
    const apiVerified = await stripeWebhookRoute(
      new Request("http://localhost:3105/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": signedHeader,
        },
        body: rawBody,
      }) as NextRequest,
    );
    assert.equal(apiVerified.status, 202);

    const apiRejected = await stripeWebhookRoute(
      new Request("http://localhost:3105/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": `t=${timestamp},v1=bad`,
        },
        body: rawBody,
      }) as NextRequest,
    );
    assert.equal(apiRejected.status, 401);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env["STRIPE_WEBHOOK_SECRET"] = originalSecret;
    }

    if (originalMode === undefined) {
      delete process.env.STRIPE_MODE;
    } else {
      process.env.STRIPE_MODE = originalMode;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: "stripe-webhook",
        normalizedEvent: "checkout.session.completed",
        duplicateStatus: duplicate.payment.eventStatus,
        mode: "synthetic-test-only",
      },
      null,
      2,
    ),
  );
}

main();
