import assert from "node:assert/strict";

import {
  calculateQuoteBufferCents,
  createOrderQuoteFingerprint,
  local3plFakeQuoteAdapter,
  resolveRoute,
  voidQuoteIfExpiredOrChanged,
  type RouteRule,
} from "../src/lib/route-quote";

const now = new Date("2026-05-11T00:00:00.000Z");
const rules: RouteRule[] = [
  {
    ruleName: "us-regional-3pl",
    countryCode: "US",
    routeType: "REGIONAL_3PL",
    shippingMode: "3PL_INTERNAL_LABEL",
    priority: 10,
    enabled: true,
  },
];

const route = resolveRoute({ countryCode: "US" }, rules);
assert.deepEqual(route, {
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
  matchedRuleName: "us-regional-3pl",
});

assert.equal(calculateQuoteBufferCents(2000), 300);
assert.equal(calculateQuoteBufferCents(10000), 500);
assert.equal(calculateQuoteBufferCents(10100), 600);

const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey: "pm:11111111-1111-4111-8111-111111111111",
  countryCode: "US",
  lines: [
    { sku: "CLF-ACC-STAND", quantity: 1 },
    { sku: "CLF-ODN-CORE", quantity: 1 },
  ],
});

const quote = local3plFakeQuoteAdapter.quote({
  orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  currency: "USD",
  countryCode: "US",
  routeType: route.routeType,
  shippingMode: route.shippingMode,
  lines: [
    { sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 },
    { sku: "CLF-ACC-STAND", quantity: 1, weightGrams: 250 },
  ],
  orderFingerprint: fingerprint,
  now,
});

assert.equal(quote.provider, "local_3pl_fake");
assert.equal(quote.expiresAt.toISOString(), "2026-05-12T00:00:00.000Z");
assert.equal(voidQuoteIfExpiredOrChanged(quote, new Date("2026-05-11T23:59:00.000Z"), fingerprint).status, "ready");
assert.equal(voidQuoteIfExpiredOrChanged(quote, new Date("2026-05-12T00:00:00.000Z"), fingerprint).voidReason, "quote_expired");
assert.equal(voidQuoteIfExpiredOrChanged(quote, now, "changed-fingerprint").voidReason, "order_changed");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "route-quote",
      provider: quote.provider,
      expiresAt: quote.expiresAt.toISOString(),
      totalCents: quote.totalCents,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
