import { calculateQuoteBufferCents } from "./buffer";
import type { QuoteAdapter, QuoteRequest, ShippingQuoteDraft } from "./types";

export const QUOTE_EXPIRY_HOURS = 24;

function expiresAtFrom(now: Date) {
  return new Date(now.getTime() + QUOTE_EXPIRY_HOURS * 60 * 60 * 1000);
}

function totalWeightGrams(request: QuoteRequest) {
  if (request.packageUnits?.length) {
    return request.packageUnits.reduce((sum, unit) => sum + unit.totalWeightGrams, 0);
  }

  return request.lines.reduce((sum, line) => sum + (line.weightGrams ?? 0) * line.quantity, 0);
}

function quoteUnitCount(request: QuoteRequest) {
  return request.packageUnits?.length || request.lines.length;
}

function packagePlanCostCents(request: QuoteRequest) {
  return request.packageUnits?.reduce((sum, unit) => sum + (unit.packagingCostCents ?? 0), 0) ?? 0;
}

export const local3plFakeQuoteAdapter: QuoteAdapter = {
  name: "local_3pl_fake",
  quote(request) {
    const baseCents = 1200;
    const perLineCents = quoteUnitCount(request) * 250;
    const weightCents = Math.ceil(totalWeightGrams(request) / 100) * 35;
    const amountCents = baseCents + perLineCents + weightCents + packagePlanCostCents(request);
    const bufferCents = calculateQuoteBufferCents(amountCents);

    return {
      orderId: request.orderId,
      routeType: request.routeType,
      shippingMode: request.shippingMode,
      provider: local3plFakeQuoteAdapter.name,
      providerQuoteId: `fake:${request.orderId}:${request.now.getTime()}`,
      status: "ready",
      currency: request.currency,
      amountCents,
      bufferCents,
      totalCents: amountCents + bufferCents,
      expiresAt: expiresAtFrom(request.now),
      orderFingerprint: request.orderFingerprint,
    };
  },
};

export type PartnerQuoteAdapter = QuoteAdapter;

export function createManualDdpQuote(request: Omit<QuoteRequest, "routeType" | "shippingMode"> & { amountCents: number; providerQuoteId?: string }) {
  const bufferCents = calculateQuoteBufferCents(request.amountCents);

  return {
    orderId: request.orderId,
    routeType: "CHINA_HK_DIRECT_DDP",
    shippingMode: "DIRECT_DDP_PROVIDER",
    provider: "manual_ddp",
    providerQuoteId: request.providerQuoteId,
    status: "ready",
    currency: request.currency,
    amountCents: request.amountCents,
    bufferCents,
    totalCents: request.amountCents + bufferCents,
    expiresAt: expiresAtFrom(request.now),
    orderFingerprint: request.orderFingerprint,
  } satisfies ShippingQuoteDraft;
}

export function voidQuoteIfExpiredOrChanged(quote: ShippingQuoteDraft, now: Date, currentOrderFingerprint: string): ShippingQuoteDraft {
  if (quote.status !== "ready" && quote.status !== "accepted") {
    return quote;
  }

  if (quote.expiresAt.getTime() <= now.getTime()) {
    return {
      ...quote,
      status: "voided",
      voidReason: "quote_expired",
    };
  }

  if (quote.orderFingerprint !== currentOrderFingerprint) {
    return {
      ...quote,
      status: "voided",
      voidReason: "order_changed",
    };
  }

  return quote;
}

export function validateFreshQuoteForPayment(quote: ShippingQuoteDraft, now: Date, currentOrderFingerprint: string) {
  const checkedQuote = voidQuoteIfExpiredOrChanged(quote, now, currentOrderFingerprint);

  if (checkedQuote.status !== "ready") {
    return {
      ok: false,
      reason: checkedQuote.voidReason ?? `quote_status_${checkedQuote.status}`,
      quote: checkedQuote,
    };
  }

  return {
    ok: true,
    reason: "fresh_quote",
    quote: checkedQuote,
  };
}
