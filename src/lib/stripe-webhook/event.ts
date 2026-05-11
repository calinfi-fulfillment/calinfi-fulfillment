import { z } from "zod";

import type { PaymentProcessingContext, PaymentProcessingResult } from "../payment-events";
import { processPaymentEvent, validateStripeTestCheckoutContract } from "../payment-events";
import type { ShippingQuoteDraft } from "../route-quote";
import type { SafetyEnv } from "../safety";
import { stripeWebhookSecret, verifyStripeWebhookSignature } from "./signature";

const StripeCheckoutSessionObjectSchema = z.object({
  id: z.string().min(1),
  amount_total: z.number().int().nonnegative().nullable(),
  currency: z.string().nullable(),
  livemode: z.boolean(),
  metadata: z.record(z.string(), z.string().optional()).nullable(),
  mode: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
});

const StripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  livemode: z.boolean(),
  data: z.object({
    object: z.unknown(),
  }),
});

export type StripeWebhookQuoteContext = {
  quoteId: string;
  quote: ShippingQuoteDraft;
  sourceOrderKey: string;
  currentOrderFingerprint: string;
  now: Date;
};

export type StripeWebhookResult =
  | {
      ok: true;
      code: "stripe_webhook_verified_pending_context";
      stripeEventId: string;
      stripeEventType: string;
      sessionId: string;
      livemode: false;
      issues: [];
    }
  | {
      ok: true;
      code: "stripe_webhook_payment_processed";
      stripeEventId: string;
      stripeEventType: "checkout.session.completed";
      sessionId: string;
      livemode: false;
      payment: PaymentProcessingResult;
      issues: [];
    }
  | {
      ok: false;
      code:
        | "stripe_live_mode_blocked"
        | "stripe_signature_missing"
        | "stripe_signature_invalid"
        | "stripe_signature_stale"
        | "stripe_webhook_secret_missing"
        | "stripe_webhook_secret_invalid"
        | "stripe_webhook_payload_invalid"
        | "stripe_webhook_event_unsupported"
        | "stripe_webhook_session_invalid"
        | "stripe_test_contract_failed";
      issues: string[];
    };

function blocked(code: StripeWebhookResult["code"], issues: string[]): StripeWebhookResult {
  return {
    ok: false,
    code: code as Exclude<StripeWebhookResult["code"], "stripe_webhook_verified_pending_context" | "stripe_webhook_payment_processed">,
    issues,
  };
}

function stripeMode(env: SafetyEnv) {
  return String(env.STRIPE_MODE ?? "test").trim() || "test";
}

export function verifyAndHandleStripeTestWebhook(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  env?: SafetyEnv;
  quoteContext?: StripeWebhookQuoteContext;
  paymentContext?: PaymentProcessingContext;
  nowSeconds?: number;
}): StripeWebhookResult {
  const env = input.env ?? process.env;

  if (stripeMode(env) !== "test") {
    return blocked("stripe_live_mode_blocked", ["Stripe webhook handling is allowed only in test mode."]);
  }

  const signature = verifyStripeWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    secret: stripeWebhookSecret(env),
    nowSeconds: input.nowSeconds,
  });

  if (!signature.ok) {
    return blocked(signature.code, signature.issues);
  }

  let eventJson: unknown;

  try {
    eventJson = JSON.parse(input.rawBody);
  } catch {
    return blocked("stripe_webhook_payload_invalid", ["Stripe webhook payload must be valid JSON."]);
  }

  const parsedEvent = StripeWebhookEventSchema.safeParse(eventJson);

  if (!parsedEvent.success) {
    return blocked(
      "stripe_webhook_payload_invalid",
      parsedEvent.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  const event = parsedEvent.data;

  if (event.livemode) {
    return blocked("stripe_live_mode_blocked", ["Stripe webhook event is live mode; refusing to process."]);
  }

  if (event.type !== "checkout.session.completed") {
    return blocked("stripe_webhook_event_unsupported", [`Unsupported Stripe webhook event type: ${event.type}.`]);
  }

  const session = StripeCheckoutSessionObjectSchema.safeParse(event.data.object);

  if (!session.success) {
    return blocked(
      "stripe_webhook_session_invalid",
      session.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  if (session.data.livemode) {
    return blocked("stripe_live_mode_blocked", ["Stripe Checkout session is live mode; refusing to process."]);
  }

  if (!input.quoteContext) {
    return {
      ok: true,
      code: "stripe_webhook_verified_pending_context",
      stripeEventId: event.id,
      stripeEventType: event.type,
      sessionId: session.data.id,
      livemode: false,
      issues: [],
    };
  }

  const contract = validateStripeTestCheckoutContract({
    session: session.data,
    quoteId: input.quoteContext.quoteId,
    quote: input.quoteContext.quote,
    sourceOrderKey: input.quoteContext.sourceOrderKey,
    currentOrderFingerprint: input.quoteContext.currentOrderFingerprint,
    now: input.quoteContext.now,
    stripeMode: stripeMode(env),
  });

  if (!contract.ok) {
    return blocked("stripe_test_contract_failed", contract.issues);
  }

  return {
    ok: true,
    code: "stripe_webhook_payment_processed",
    stripeEventId: event.id,
    stripeEventType: event.type,
    sessionId: session.data.id,
    livemode: false,
    payment: processPaymentEvent(contract.paymentPayload, input.paymentContext ?? { seenEventKeys: new Set() }),
    issues: [],
  };
}
