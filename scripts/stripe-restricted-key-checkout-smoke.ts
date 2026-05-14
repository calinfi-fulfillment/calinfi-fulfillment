import { createOrderQuoteFingerprint, local3plFakeQuoteAdapter } from "../src/lib/route-quote";
import { createStripeCheckoutReadiness, createStripeCheckoutSession } from "../src/lib/stripe-checkout";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

async function main() {
  const disabledReadiness = createStripeCheckoutReadiness(process.env);
  const env = {
    ...process.env,
    FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true",
  };
  const enabledReadiness = createStripeCheckoutReadiness(env);

  const sourceOrderKey = "pm:stripe-rk-test-smoke";
  const quoteId = "33333333-3333-4333-8333-333333333333";
  const now = new Date("2026-05-14T16:00:00.000Z");
  const fingerprint = createOrderQuoteFingerprint({
    sourceOrderKey,
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
  });
  const quote = local3plFakeQuoteAdapter.quote({
    orderId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    routeType: "REGIONAL_3PL",
    shippingMode: "3PL_INTERNAL_LABEL",
    currency: "USD",
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
    orderFingerprint: fingerprint,
    now,
  });
  const checkout = enabledReadiness.ok
    ? await createStripeCheckoutSession(
        {
          quoteId,
          sourceOrderKey,
          currentOrderFingerprint: fingerprint,
          now: now.toISOString(),
          quote: {
            ...quote,
            expiresAt: quote.expiresAt.toISOString(),
          },
        },
        { env },
      )
    : null;
  const ok = enabledReadiness.ok && checkout?.ok === true;

  console.log(
    JSON.stringify(
      {
        ok,
        checked: "stripe-restricted-key-checkout-smoke",
        disabledReadiness: {
          code: disabledReadiness.code,
          status: disabledReadiness.status,
        },
        enabledReadiness: {
          code: enabledReadiness.code,
          status: enabledReadiness.status,
        },
        checkout: checkout
          ? checkout.ok
            ? {
                ok: true,
                code: checkout.code,
                sessionId: checkout.sessionId,
                livemode: checkout.livemode,
                urlReturned: Boolean(checkout.url),
              }
            : {
                ok: false,
                code: checkout.code,
                issues: checkout.issues,
              }
          : null,
        stripeSecret: "redacted",
        externalActions: "stripe_test_checkout_session_create_only",
      },
      null,
      2,
    ),
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

main();
