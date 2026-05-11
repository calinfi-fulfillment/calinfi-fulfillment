import { StripeCheckoutMetadataSchema } from "../payment-contract/schema";
import { validateFreshQuoteForPayment, type ShippingQuoteDraft } from "../route-quote";
import type { PaymentEventPayload } from "./schema";

export type StripeCheckoutSessionLike = {
  id: string;
  amount_total: number | null;
  currency: string | null;
  livemode: boolean;
  metadata: Record<string, string | undefined> | null;
  mode?: string | null;
  payment_status?: string | null;
};

export type StripeTestContractInput = {
  session: StripeCheckoutSessionLike;
  quoteId: string;
  quote: ShippingQuoteDraft;
  sourceOrderKey: string;
  currentOrderFingerprint: string;
  now: Date;
  stripeMode?: string;
};

export type StripeTestContractResult =
  | {
      ok: true;
      code: "stripe_test_contract_ready";
      paymentPayload: PaymentEventPayload;
      issues: [];
    }
  | {
      ok: false;
      code:
        | "stripe_live_mode_blocked"
        | "stripe_session_not_paid"
        | "stripe_metadata_invalid"
        | "stripe_metadata_mismatch"
        | "stripe_amount_mismatch"
        | "stripe_currency_mismatch"
        | "quote_not_payable";
      issues: string[];
    };

function blocked(code: StripeTestContractResult["code"], issue: string): StripeTestContractResult {
  return {
    ok: false,
    code: code as Exclude<StripeTestContractResult["code"], "stripe_test_contract_ready">,
    issues: [issue],
  };
}

export function validateStripeTestCheckoutContract(input: StripeTestContractInput): StripeTestContractResult {
  const stripeMode = input.stripeMode ?? "test";

  if (stripeMode !== "test" || input.session.livemode) {
    return blocked("stripe_live_mode_blocked", "Stripe Checkout validation is allowed only in test mode.");
  }

  if (input.session.mode && input.session.mode !== "payment") {
    return blocked("stripe_session_not_paid", "Stripe Checkout session is not a payment session.");
  }

  if (input.session.payment_status && input.session.payment_status !== "paid") {
    return blocked("stripe_session_not_paid", "Stripe Checkout session is not paid.");
  }

  const metadata = StripeCheckoutMetadataSchema.safeParse(input.session.metadata ?? {});

  if (!metadata.success) {
    return {
      ok: false,
      code: "stripe_metadata_invalid",
      issues: metadata.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const expectedCurrency = input.quote.currency.toUpperCase();
  const sessionCurrency = String(input.session.currency ?? "").toUpperCase();

  const mismatches = [
    metadata.data.environment !== "test" ? "metadata environment must be test" : "",
    metadata.data.fulfillment_order_id !== input.quote.orderId ? "metadata order id does not match quote" : "",
    metadata.data.fulfillment_quote_id !== input.quoteId ? "metadata quote id does not match expected quote" : "",
    metadata.data.source_order_key !== input.sourceOrderKey ? "metadata source order key does not match" : "",
    metadata.data.quote_fingerprint !== input.currentOrderFingerprint ? "metadata quote fingerprint does not match current order" : "",
  ].filter(Boolean);

  if (mismatches.length > 0) {
    return {
      ok: false,
      code: "stripe_metadata_mismatch",
      issues: mismatches,
    };
  }

  const metadataAmount = Number.parseInt(metadata.data.amount_cents, 10);

  if (input.session.amount_total !== input.quote.totalCents || metadataAmount !== input.quote.totalCents) {
    return blocked("stripe_amount_mismatch", "Stripe amount does not match Fulfillment quote total.");
  }

  if (sessionCurrency !== expectedCurrency || metadata.data.currency.toUpperCase() !== expectedCurrency) {
    return blocked("stripe_currency_mismatch", "Stripe currency does not match Fulfillment quote currency.");
  }

  const freshQuote = validateFreshQuoteForPayment(input.quote, input.now, input.currentOrderFingerprint);

  if (!freshQuote.ok) {
    return blocked("quote_not_payable", `Quote is not payable: ${freshQuote.reason}.`);
  }

  return {
    ok: true,
    code: "stripe_test_contract_ready",
    issues: [],
    paymentPayload: {
      eventId: `stripe:${input.session.id}`,
      eventType: "stripe.checkout.session.completed",
      orderId: input.quote.orderId,
      quoteId: input.quoteId,
      sourceOrderKey: input.sourceOrderKey,
      amountCents: input.quote.totalCents,
      currency: expectedCurrency,
      orderStatusBefore: "payment_pending",
      decisionStatusBefore: "payment_pending",
      quote: {
        ...input.quote,
        expiresAt: input.quote.expiresAt.toISOString(),
      },
      currentOrderFingerprint: input.currentOrderFingerprint,
      now: input.now.toISOString(),
    },
  };
}
