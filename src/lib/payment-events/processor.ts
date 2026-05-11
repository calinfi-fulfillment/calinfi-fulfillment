import type { DecisionStatus, OrderStatus } from "../domain";
import { validateFreshQuoteForPayment, type ShippingQuoteDraft } from "../route-quote";
import type { PaymentEventPayload } from "./schema";

export type PaymentProcessingIssue = {
  code: "payment_review_required";
  detail: string;
};

export type PaymentProcessingResult = {
  eventStatus: "accepted" | "duplicate" | "mismatch" | "ignored";
  lockApplied: boolean;
  orderStatus: OrderStatus;
  decisionStatus: DecisionStatus;
  issues: PaymentProcessingIssue[];
};

export type PaymentProcessingContext = {
  seenEventKeys: Set<string>;
};

function quoteFromPayload(payload: PaymentEventPayload): ShippingQuoteDraft {
  return {
    ...payload.quote,
    expiresAt: new Date(payload.quote.expiresAt),
  };
}

function mismatch(detail: string, payload: PaymentEventPayload): PaymentProcessingResult {
  return {
    eventStatus: "mismatch",
    lockApplied: false,
    orderStatus: payload.orderStatusBefore,
    decisionStatus: payload.decisionStatusBefore,
    issues: [
      {
        code: "payment_review_required",
        detail,
      },
    ],
  };
}

export function processPaymentEvent(payload: PaymentEventPayload, context: PaymentProcessingContext): PaymentProcessingResult {
  if (context.seenEventKeys.has(payload.eventId)) {
    return {
      eventStatus: "duplicate",
      lockApplied: false,
      orderStatus: payload.orderStatusBefore,
      decisionStatus: payload.decisionStatusBefore,
      issues: [],
    };
  }

  context.seenEventKeys.add(payload.eventId);

  if (payload.eventType === "owner.covered_payment.approved" && !payload.ownerApproved) {
    return mismatch("Covered payment event is missing owner approval.", payload);
  }

  if (payload.orderId !== payload.quote.orderId) {
    return mismatch("Payment order does not match quote order.", payload);
  }

  if (payload.amountCents !== payload.quote.totalCents) {
    return mismatch("Payment amount does not match quote total.", payload);
  }

  if (payload.currency !== payload.quote.currency) {
    return mismatch("Payment currency does not match quote currency.", payload);
  }

  const freshQuote = validateFreshQuoteForPayment(
    quoteFromPayload(payload),
    payload.now ? new Date(payload.now) : new Date(),
    payload.currentOrderFingerprint,
  );

  if (!freshQuote.ok) {
    return mismatch(`Quote is not payable: ${freshQuote.reason}.`, payload);
  }

  return {
    eventStatus: "accepted",
    lockApplied: true,
    orderStatus: "locked_for_fulfillment",
    decisionStatus: "paid_locked",
    issues: [],
  };
}
