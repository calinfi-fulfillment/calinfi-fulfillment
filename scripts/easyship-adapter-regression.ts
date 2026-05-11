import assert from "node:assert/strict";

import {
  buildEasyshipRatesRequestPlan,
  buildEasyshipShipmentRequestPlan,
  createEasyshipReadiness,
  easyshipProviderAdapter,
} from "../src/lib/easyship";
import { createOrderQuoteFingerprint } from "../src/lib/route-quote";

const sourceOrderKey = "pm:easyship-adapter";
const fingerprint = createOrderQuoteFingerprint({
  sourceOrderKey,
  countryCode: "US",
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
});
const quoteRequest = {
  orderId: "abababab-abab-4aba-8bab-abababababab",
  currency: "USD",
  countryCode: "US",
  routeType: "REGIONAL_3PL" as const,
  shippingMode: "3PL_INTERNAL_LABEL" as const,
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: fingerprint,
  now: new Date("2026-05-12T00:00:00.000Z"),
};
const ratePlanInput = {
  quoteRequest,
  originAddress: {
    country_alpha2: "US",
    line_1: "Synthetic warehouse",
    city: "Los Angeles",
    state: "CA",
    postal_code: "90001",
  },
  destinationAddress: {
    country_alpha2: "US",
    line_1: "Synthetic destination",
    city: "Seattle",
    state: "WA",
    postal_code: "98101",
  },
  box: {
    length: 30,
    width: 20,
    height: 12,
    unit: "cm" as const,
  },
  totalActualWeightKg: 1.2,
  incoterms: "DDU" as const,
  calculateTaxAndDuties: false,
};

const defaultReadiness = createEasyshipReadiness({});
assert.equal(defaultReadiness.ok, true);
assert.equal(defaultReadiness.code, "easyship_mock_only");

const missingSandboxToken = createEasyshipReadiness({
  EASYSHIP_MODE: "sandbox",
  EASYSHIP_ENABLE_RATES: "true",
});
assert.equal(missingSandboxToken.ok, false);
assert.equal(missingSandboxToken.code, "easyship_token_missing");

const sandboxReady = createEasyshipReadiness({
  EASYSHIP_MODE: "sandbox",
  EASYSHIP_API_TOKEN: "sandbox_synthetic_token",
  EASYSHIP_ENABLE_RATES: "true",
  EASYSHIP_ENABLE_SHIPMENTS: "false",
  EASYSHIP_ENABLE_TRACKING: "false",
});
assert.equal(sandboxReady.ok, true);
assert.equal(sandboxReady.code, "easyship_sandbox_ready");

const productionBlocked = createEasyshipReadiness({
  EASYSHIP_MODE: "production",
  EASYSHIP_API_TOKEN: "production_synthetic_token",
  EASYSHIP_ENABLE_RATES: "true",
});
assert.equal(productionBlocked.ok, false);
assert.equal(productionBlocked.code, "easyship_production_blocked");

const ratesPlan = buildEasyshipRatesRequestPlan(ratePlanInput, {
  EASYSHIP_MODE: "sandbox",
  EASYSHIP_API_TOKEN: "sandbox_synthetic_token",
});
assert.equal(ratesPlan.method, "POST");
assert.equal(ratesPlan.url, "https://public-api-sandbox.easyship.com/2024-09/rates");
assert.equal(ratesPlan.headers.authorization, "Bearer <configured>");
assert.equal(JSON.stringify(ratesPlan).includes("sandbox_synthetic_token"), false);
assert.equal(ratesPlan.externalActions, "none");

const shipmentPlan = buildEasyshipShipmentRequestPlan(
  {
    ...ratePlanInput,
    idempotencyKey: "easyship:pm:synthetic:v1",
    platformOrderNumber: sourceOrderKey,
  },
  { EASYSHIP_MODE: "sandbox", EASYSHIP_API_TOKEN: "sandbox_synthetic_token" },
);
assert.equal(shipmentPlan.method, "POST");
assert.equal(shipmentPlan.url, "https://public-api-sandbox.easyship.com/2024-09/shipments");
assert.equal(shipmentPlan.externalActions, "none");

const blockedHandoff = easyshipProviderAdapter.createHandoff!({
  orderId: quoteRequest.orderId,
  sourceOrderKey,
  routeType: quoteRequest.routeType,
  shippingMode: quoteRequest.shippingMode,
  idempotencyKey: "easyship:blocked:v1",
});
assert.equal(blockedHandoff.ok, false);
assert.equal(blockedHandoff.status, "blocked");
assert.equal(blockedHandoff.externalActions, "none");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "easyship-adapter",
      ratesEndpoint: ratesPlan.url,
      sandboxStatus: sandboxReady.code,
      externalActions: "none",
    },
    null,
    2,
  ),
);
