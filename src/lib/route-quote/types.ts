import type { FulfillmentRouteType, QuoteStatus, ShippingMode } from "../domain";

export type RouteRule = {
  ruleName: string;
  countryCode?: string;
  regionCode?: string;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  priority: number;
  enabled: boolean;
};

export type RouteRequest = {
  countryCode: string;
  regionCode?: string;
};

export type RouteDecision = {
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  matchedRuleName: string;
};

export type QuoteRequestLine = {
  sku: string;
  quantity: number;
  weightGrams?: number;
};

export type QuoteRequest = {
  orderId: string;
  currency: string;
  countryCode: string;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  lines: QuoteRequestLine[];
  orderFingerprint: string;
  now: Date;
};

export type ShippingQuoteDraft = {
  orderId: string;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  provider: string;
  providerQuoteId?: string;
  status: QuoteStatus;
  currency: string;
  amountCents: number;
  bufferCents: number;
  totalCents: number;
  expiresAt: Date;
  orderFingerprint: string;
  voidReason?: string;
};

export type ProviderRate = ShippingQuoteDraft & {
  serviceLevel: string;
  etaDaysMin: number;
  etaDaysMax: number;
  externalActions: "none";
};

export type ProviderHandoffRequest = {
  orderId: string;
  sourceOrderKey: string;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  idempotencyKey: string;
};

export type ProviderHandoffResult = {
  ok: boolean;
  provider: string;
  providerHandoffId: string;
  status: "mock_created" | "blocked";
  idempotencyKey: string;
  externalActions: "none";
  reason?: string;
};

export type ProviderTrackingRequest = {
  providerHandoffId: string;
};

export type ProviderTrackingResult = {
  provider: string;
  providerHandoffId: string;
  status: "label_pending" | "in_fulfillment" | "shipped" | "delivered" | "blocked";
  trackingNumber?: string;
  externalActions: "none";
};

export type ProviderHealthReport = {
  ok: boolean;
  provider: string;
  mode: "mock_only" | "blocked_live_flag";
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
};

export type QuoteAdapter = {
  name: string;
  quote(request: QuoteRequest): ShippingQuoteDraft;
  getRates?(request: QuoteRequest): ProviderRate[];
  createHandoff?(request: ProviderHandoffRequest): ProviderHandoffResult;
  getTracking?(request: ProviderTrackingRequest): ProviderTrackingResult;
  healthCheck?(env?: Partial<Record<string, string | undefined>>): ProviderHealthReport;
};
