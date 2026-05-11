import assert from "node:assert/strict";

import { createManualDdpQuote, createOrderQuoteFingerprint, resolveRoute, type RouteRule } from "../src/lib/route-quote";

const rules: RouteRule[] = [
  {
    ruleName: "hk-direct-ddp",
    countryCode: "HK",
    routeType: "CHINA_HK_DIRECT_DDP",
    shippingMode: "DIRECT_DDP_PROVIDER",
    priority: 1,
    enabled: true,
  },
];

const route = resolveRoute({ countryCode: "HK" }, rules);
assert.equal(route.routeType, "CHINA_HK_DIRECT_DDP");
assert.equal(route.shippingMode, "DIRECT_DDP_PROVIDER");

const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey: "pm:33333333-3333-4333-8333-333333333333",
  countryCode: "HK",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});

const quote = createManualDdpQuote({
  orderId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  currency: "USD",
  countryCode: "HK",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now: new Date("2026-05-11T00:00:00.000Z"),
  amountCents: 12345,
  providerQuoteId: "manual-ddp-001",
});

assert.equal(quote.routeType, "CHINA_HK_DIRECT_DDP");
assert.equal(quote.shippingMode, "DIRECT_DDP_PROVIDER");
assert.equal(quote.provider, "manual_ddp");
assert.equal(quote.bufferCents, 700);
assert.equal(quote.totalCents, 13045);
assert.equal(quote.expiresAt.toISOString(), "2026-05-12T00:00:00.000Z");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "manual-ddp",
      routeType: quote.routeType,
      shippingMode: quote.shippingMode,
      totalCents: quote.totalCents,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
