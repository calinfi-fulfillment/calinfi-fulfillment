import type Stripe from "stripe";

import { createOrderQuoteFingerprint, local3plFakeQuoteAdapter } from "../route-quote";
import { createStripeCheckoutSession, type StripeCheckoutSessionClient } from "../stripe-checkout";
import { createSyntheticStripeSignatureHeader, verifyAndHandleStripeTestWebhook } from "../stripe-webhook";

const SYNTHETIC_NOW = new Date("2026-05-12T00:00:00.000Z");
const SYNTHETIC_TIMESTAMP = 1_768_176_000;
const SYNTHETIC_WEBHOOK_SECRET = ["wh", "sec", "_synthetic_test_pilot"].join("");

export type SyntheticStripeTestPilotResult =
  | {
      ok: true;
      code: "synthetic_stripe_test_pilot_completed";
      sourceOrderKey: string;
      quoteId: string;
      checkoutSessionId: string;
      lockStatus: "locked_for_fulfillment";
      externalCalls: "mocked";
    }
  | {
      ok: false;
      code: "synthetic_stripe_test_pilot_failed";
      issues: string[];
    };

export async function runSyntheticStripeTestPilot(): Promise<SyntheticStripeTestPilotResult> {
  const sourceOrderKey = "pm:44444444-4444-4444-8444-444444444444";
  const quoteId = "11111111-2222-4333-8444-555555555555";
  const fingerprint = createOrderQuoteFingerprint({
    sourceOrderKey,
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
  });
  const quote = local3plFakeQuoteAdapter.quote({
    orderId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    routeType: "REGIONAL_3PL",
    shippingMode: "3PL_INTERNAL_LABEL",
    currency: "USD",
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
    orderFingerprint: fingerprint,
    now: SYNTHETIC_NOW,
  });
  const request = {
    quoteId,
    sourceOrderKey,
    currentOrderFingerprint: fingerprint,
    now: SYNTHETIC_NOW.toISOString(),
    quote: {
      ...quote,
      expiresAt: quote.expiresAt.toISOString(),
    },
  };
  const createCalls: Array<Stripe.Checkout.SessionCreateParams> = [];
  const mockClient: StripeCheckoutSessionClient = {
    checkout: {
      sessions: {
        async create(params) {
          createCalls.push(params);

          return {
            id: "cs_test_synthetic_pilot",
            livemode: false,
            url: "https://checkout.stripe.com/c/pay/cs_test_synthetic_pilot",
          };
        },
      },
    },
  };
  const checkout = await createStripeCheckoutSession(request, {
    env: {
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: "rk_test_synthetic",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_synthetic",
      NEXT_PUBLIC_APP_URL: "http://localhost:3105",
      FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true",
    },
    stripeClient: mockClient,
  });

  if (!checkout.ok) {
    return {
      ok: false,
      code: "synthetic_stripe_test_pilot_failed",
      issues: checkout.issues,
    };
  }

  const createdParams = createCalls[0];
  const metadata = createdParams?.metadata ?? {};
  const eventBody = JSON.stringify({
    id: "evt_test_synthetic_pilot",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: checkout.sessionId,
        amount_total: quote.totalCents,
        currency: quote.currency.toLowerCase(),
        livemode: false,
        metadata,
        mode: "payment",
        payment_status: "paid",
      },
    },
  });
  const signature = createSyntheticStripeSignatureHeader({
    rawBody: eventBody,
    secret: SYNTHETIC_WEBHOOK_SECRET,
    timestamp: SYNTHETIC_TIMESTAMP,
  });
  const webhook = verifyAndHandleStripeTestWebhook({
    rawBody: eventBody,
    signatureHeader: signature,
    env: {
      STRIPE_MODE: "test",
      STRIPE_WEBHOOK_SECRET: SYNTHETIC_WEBHOOK_SECRET,
    },
    quoteContext: {
      quoteId,
      quote,
      sourceOrderKey,
      currentOrderFingerprint: fingerprint,
      now: SYNTHETIC_NOW,
    },
    paymentContext: { seenEventKeys: new Set() },
    nowSeconds: SYNTHETIC_TIMESTAMP,
  });

  if (!webhook.ok || webhook.code !== "stripe_webhook_payment_processed" || !webhook.payment.lockApplied) {
    return {
      ok: false,
      code: "synthetic_stripe_test_pilot_failed",
      issues: webhook.issues.length > 0 ? webhook.issues : ["Synthetic webhook did not lock the order."],
    };
  }

  return {
    ok: true,
    code: "synthetic_stripe_test_pilot_completed",
    sourceOrderKey,
    quoteId,
    checkoutSessionId: checkout.sessionId,
    lockStatus: "locked_for_fulfillment",
    externalCalls: "mocked",
  };
}
