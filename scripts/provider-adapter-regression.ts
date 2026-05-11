import assert from "node:assert/strict";

import { createProviderHealthReport, mockFulfillmentProviderAdapter } from "../src/lib/provider-adapter";
import { createOrderQuoteFingerprint } from "../src/lib/route-quote";

const now = new Date("2026-05-11T00:00:00.000Z");
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey: "pm:provider-adapter",
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const request = {
  orderId: "12121212-1212-4212-8212-121212121212",
  currency: "USD",
  countryCode: "US",
  routeType: "REGIONAL_3PL" as const,
  shippingMode: "3PL_INTERNAL_LABEL" as const,
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now,
};

const health = createProviderHealthReport({
  FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
  FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
});
assert.equal(health.ok, true);
assert.equal(health.mode, "mock_only");

const blockedHealth = createProviderHealthReport({
  FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "true",
  FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
});
assert.equal(blockedHealth.ok, false);
assert.equal(blockedHealth.mode, "blocked_live_flag");

const rates = mockFulfillmentProviderAdapter.getRates!(request);
assert.equal(rates.length, 2);
assert.equal(rates.every((rate) => rate.externalActions === "none"), true);
assert.equal(rates[0]?.provider, "mock_fulfillment_provider");
assert.equal(rates[0]?.status, "ready");

const quote = mockFulfillmentProviderAdapter.quote(request);
assert.equal(quote.provider, "mock_fulfillment_provider");
assert.equal(quote.totalCents, rates[0]?.totalCents);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "provider-adapter",
      rates: rates.length,
      provider: quote.provider,
      mode: health.mode,
    },
    null,
    2,
  ),
);
