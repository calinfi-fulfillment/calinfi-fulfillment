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

export type QuoteAdapter = {
  name: string;
  quote(request: QuoteRequest): ShippingQuoteDraft;
};
