import { calculateQuoteBufferCents } from "../route-quote/buffer";
import {
  type ProviderHandoffRequest,
  type ProviderHealthReport,
  type ProviderRate,
  type ProviderTrackingRequest,
  type QuoteAdapter,
  type QuoteRequest,
} from "../route-quote/types";
import type { SafetyEnv } from "../safety";

function enabled(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim() === "true";
}

function expiryFrom(now: Date) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function rateFor(request: QuoteRequest, serviceLevel: string, amountCents: number, etaDaysMin: number, etaDaysMax: number): ProviderRate {
  const bufferCents = calculateQuoteBufferCents(amountCents);

  return {
    orderId: request.orderId,
    routeType: request.routeType,
    shippingMode: request.shippingMode,
    provider: mockFulfillmentProviderAdapter.name,
    providerQuoteId: `mock-rate:${serviceLevel}:${request.orderId}`,
    status: "ready",
    currency: request.currency,
    amountCents,
    bufferCents,
    totalCents: amountCents + bufferCents,
    expiresAt: expiryFrom(request.now),
    orderFingerprint: request.orderFingerprint,
    serviceLevel,
    etaDaysMin,
    etaDaysMax,
    externalActions: "none",
  };
}

export function createProviderHealthReport(env: SafetyEnv = process.env): ProviderHealthReport {
  const providerQuotesEnabled = enabled(env, "FULFILLMENT_ENABLE_PROVIDER_API_QUOTES");
  const partnerPushEnabled = enabled(env, "FULFILLMENT_ENABLE_PARTNER_API_PUSH");

  return {
    ok: !providerQuotesEnabled && !partnerPushEnabled,
    provider: mockFulfillmentProviderAdapter.name,
    mode: providerQuotesEnabled || partnerPushEnabled ? "blocked_live_flag" : "mock_only",
    checks: [
      {
        name: "provider-api-quotes-disabled",
        ok: !providerQuotesEnabled,
        detail: providerQuotesEnabled ? "Provider API quote calls are enabled and must be reviewed." : "Provider API quote calls are disabled.",
      },
      {
        name: "partner-api-push-disabled",
        ok: !partnerPushEnabled,
        detail: partnerPushEnabled ? "Partner API push is enabled and must be reviewed." : "Partner API push is disabled.",
      },
    ],
  };
}

export const mockFulfillmentProviderAdapter: QuoteAdapter = {
  name: "mock_fulfillment_provider",
  quote(request) {
    return this.getRates!(request)[0]!;
  },
  getRates(request) {
    return [
      rateFor(request, "mock_standard", 1800 + request.lines.length * 225, 6, 9),
      rateFor(request, "mock_priority", 2600 + request.lines.length * 350, 3, 5),
    ];
  },
  createHandoff(request: ProviderHandoffRequest) {
    return {
      ok: true,
      provider: mockFulfillmentProviderAdapter.name,
      providerHandoffId: `mock-handoff:${request.idempotencyKey}`,
      status: "mock_created",
      idempotencyKey: request.idempotencyKey,
      externalActions: "none",
    };
  },
  getTracking(request: ProviderTrackingRequest) {
    return {
      provider: mockFulfillmentProviderAdapter.name,
      providerHandoffId: request.providerHandoffId,
      status: "label_pending",
      trackingNumber: `MOCK-${request.providerHandoffId.slice(-8).toUpperCase()}`,
      externalActions: "none",
    };
  },
  healthCheck(env) {
    return createProviderHealthReport(env);
  },
};
