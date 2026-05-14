import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { POST as createCheckoutRoute } from "../src/app/api/stripe/checkout/route";
import {
  buildStripeCheckoutSessionParams,
  createStripeCheckoutReadiness,
  createStripeCheckoutSession,
  type StripeCheckoutSessionClient,
} from "../src/lib/stripe-checkout";
import { createManualDdpQuote, createOrderQuoteFingerprint } from "../src/lib/route-quote";

const now = new Date("2026-05-12T00:00:00.000Z");
const sourceOrderKey = "pm:11111111-1111-4111-8111-111111111111";
const quoteId = "22222222-2222-4222-8222-222222222222";
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey,
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const quote = createManualDdpQuote({
  orderId: "33333333-3333-4333-8333-333333333333",
  currency: "USD",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now,
  amountCents: 5000,
});
const request = {
  quoteId,
  sourceOrderKey,
  currentOrderFingerprint: fingerprint,
  now: now.toISOString(),
  quote: {
    ...quote,
    expiresAt: quote.expiresAt.toISOString(),
  },
};

async function main() {
  const invalidJsonResponse = await createCheckoutRoute(
    new Request("http://localhost:3105/api/stripe/checkout", {
      method: "POST",
      body: "not-json",
    }) as NextRequest,
  );
  assert.equal(invalidJsonResponse.status, 400);

  const disabledReadiness = createStripeCheckoutReadiness({
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "rk_test_synthetic",
    FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "false",
  });
  assert.equal(disabledReadiness.code, "stripe_checkout_disabled");

  const disabledCreate = await createStripeCheckoutSession(request, {
    env: {
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: "rk_test_synthetic",
      FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "false",
    },
  });
  assert.equal(disabledCreate.ok, false);
  assert.equal(disabledCreate.code, "stripe_checkout_disabled");

  const liveMode = createStripeCheckoutReadiness({
    STRIPE_MODE: "live",
    STRIPE_SECRET_KEY: "rk_test_synthetic",
    FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true",
  });
  assert.equal(liveMode.ok, false);
  assert.equal(liveMode.code, "stripe_live_mode_blocked");

  const unrestrictedKey = createStripeCheckoutReadiness({
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_synthetic",
    FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true",
  });
  assert.equal(unrestrictedKey.ok, false);
  assert.equal(unrestrictedKey.code, "stripe_restricted_test_key_required");

  const params = buildStripeCheckoutSessionParams(request, {
    NEXT_PUBLIC_APP_URL: "http://localhost:3105",
  });
  assert.equal(params.ok, true);

  if (!params.ok) {
    throw new Error("Expected checkout params to build.");
  }

  assert.equal(params.params.mode, "payment");
  assert.equal("payment_method_types" in params.params, false);
  assert.equal(params.params.line_items?.[0]?.price_data?.unit_amount, quote.totalCents);
  assert.equal(params.params.metadata?.fulfillment_quote_id, quoteId);
  assert.equal(params.params.metadata?.environment, "test");
  assert.match(params.idempotencyKey, /^stripe-checkout:/);

  const createCalls: Array<{
    params: Stripe.Checkout.SessionCreateParams;
    options?: Stripe.RequestOptions;
  }> = [];
  const mockClient: StripeCheckoutSessionClient = {
    checkout: {
      sessions: {
        async create(createParams, options) {
          createCalls.push({ params: createParams, options });

          return {
            id: "cs_test_synthetic_checkout",
            livemode: false,
            url: "https://checkout.stripe.com/c/pay/cs_test_synthetic_checkout",
          };
        },
      },
    },
  };

  const created = await createStripeCheckoutSession(request, {
    env: {
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: "rk_test_synthetic",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_synthetic",
      NEXT_PUBLIC_APP_URL: "http://localhost:3105",
      FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true",
    },
    stripeClient: mockClient,
  });
  assert.equal(created.ok, true);

  if (!created.ok) {
    throw new Error("Expected synthetic Checkout session to be created.");
  }

  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0]?.options?.idempotencyKey, params.idempotencyKey);
  assert.equal(created.livemode, false);
  assert.match(created.url, /^https:\/\/checkout\.stripe\.com\//);

  const expired = buildStripeCheckoutSessionParams(
    {
      ...request,
      now: new Date(quote.expiresAt.getTime() + 1).toISOString(),
    },
    { NEXT_PUBLIC_APP_URL: "http://localhost:3105" },
  );
  assert.equal(expired.ok, false);
  assert.equal(expired.code, "quote_not_payable");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: "stripe-checkout",
        mode: "synthetic-test-only",
        createdSession: created.sessionId,
        externalCalls: "mocked",
      },
      null,
      2,
    ),
  );
}

main();
