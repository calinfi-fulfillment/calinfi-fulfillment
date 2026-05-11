import { calculateQuoteBufferCents } from "../route-quote/buffer";
import type {
  ProviderHandoffRequest,
  ProviderRate,
  ProviderTrackingRequest,
  QuoteAdapter,
  QuoteRequest,
} from "../route-quote/types";
import { createEasyshipReadiness } from "./config";

function expiryFrom(now: Date) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function blockedRate(request: QuoteRequest, serviceLevel: string): ProviderRate {
  const amountCents = 0;

  return {
    orderId: request.orderId,
    routeType: request.routeType,
    shippingMode: request.shippingMode,
    provider: easyshipProviderAdapter.name,
    providerQuoteId: `easyship-blocked:${request.orderId}`,
    status: "failed",
    currency: request.currency,
    amountCents,
    bufferCents: calculateQuoteBufferCents(amountCents),
    totalCents: amountCents,
    expiresAt: expiryFrom(request.now),
    orderFingerprint: request.orderFingerprint,
    serviceLevel,
    etaDaysMin: 0,
    etaDaysMax: 0,
    externalActions: "none",
  };
}

export const easyshipProviderAdapter: QuoteAdapter = {
  name: "easyship",
  quote(request) {
    return this.getRates!(request)[0]!;
  },
  getRates(request) {
    return [blockedRate(request, "easyship_api_ready_request_plan_only")];
  },
  createHandoff(request: ProviderHandoffRequest) {
    return {
      ok: false,
      provider: easyshipProviderAdapter.name,
      providerHandoffId: `easyship-blocked:${request.idempotencyKey}`,
      status: "blocked",
      idempotencyKey: request.idempotencyKey,
      externalActions: "none",
      reason: "Easyship shipment creation is disabled until owner approves sandbox/live shipment calls.",
    };
  },
  getTracking(request: ProviderTrackingRequest) {
    return {
      provider: easyshipProviderAdapter.name,
      providerHandoffId: request.providerHandoffId,
      status: "blocked",
      externalActions: "none",
    };
  },
  healthCheck(env) {
    const readiness = createEasyshipReadiness(env);

    return {
      ok: readiness.ok,
      provider: readiness.provider,
      mode: readiness.ok && readiness.mode === "sandbox" ? "mock_only" : readiness.mode === "production" ? "blocked_live_flag" : "mock_only",
      checks: readiness.checks,
    };
  },
};
