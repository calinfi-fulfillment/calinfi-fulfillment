import Stripe from "stripe";
import { z } from "zod";

import { PaymentQuoteSchema, StripeCheckoutMetadataSchema } from "../payment-contract";
import { validateFreshQuoteForPayment, type ShippingQuoteDraft } from "../route-quote";
import type { SafetyEnv } from "../safety";
import { createStripeCheckoutReadiness, stripeCheckoutSecretKey, type StripeCheckoutBlockingCode } from "./config";

export const CreateStripeCheckoutSessionRequestSchema = z.object({
  quoteId: z.string().uuid(),
  sourceOrderKey: z.string().startsWith("pm:"),
  quote: PaymentQuoteSchema,
  currentOrderFingerprint: z.string().min(1),
  now: z.string().datetime().optional(),
  successPath: z.string().startsWith("/").default("/payments/stripe/success"),
  cancelPath: z.string().startsWith("/").default("/payments/stripe/cancel"),
});

export type CreateStripeCheckoutSessionRequest = z.infer<typeof CreateStripeCheckoutSessionRequestSchema>;

export type StripeCheckoutSessionClient = {
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
        options?: Stripe.RequestOptions,
      ): Promise<Pick<Stripe.Checkout.Session, "id" | "livemode" | "url">>;
    };
  };
};

export type StripeCheckoutSessionParamsResult =
  | {
      ok: true;
      code: "stripe_checkout_params_ready";
      params: Stripe.Checkout.SessionCreateParams;
      idempotencyKey: string;
    }
  | {
      ok: false;
      code: "invalid_checkout_payload" | "quote_not_payable";
      issues: string[];
    };

export type CreateStripeCheckoutSessionResult =
  | {
      ok: true;
      code: "stripe_checkout_session_created";
      sessionId: string;
      url: string;
      livemode: false;
    }
  | {
      ok: false;
      code:
        | "stripe_checkout_disabled"
        | "stripe_live_mode_blocked"
        | "stripe_restricted_test_key_missing"
        | "stripe_restricted_test_key_required"
        | "stripe_publishable_key_invalid"
        | "invalid_checkout_payload"
        | "quote_not_payable"
        | "stripe_session_create_failed";
      issues: string[];
    };

function appBaseUrl(env: SafetyEnv) {
  const explicit = String(env.NEXT_PUBLIC_APP_URL ?? "").trim();

  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = String(env.VERCEL_URL ?? "").trim();
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");

  return "http://localhost:3105";
}

function toShippingQuoteDraft(input: CreateStripeCheckoutSessionRequest["quote"]): ShippingQuoteDraft {
  return {
    ...input,
    expiresAt: new Date(input.expiresAt),
  };
}

function normalizedCurrency(currency: string) {
  return currency.toUpperCase();
}

function checkoutLineItemName(quote: ShippingQuoteDraft) {
  if (quote.routeType === "CHINA_HK_DIRECT_DDP") return "ODUN delivery quote - Direct DDP";
  if (quote.routeType === "PARTNER_MANAGED") return "ODUN delivery quote - Partner managed";
  return "ODUN delivery quote";
}

function stripeSessionPlaceholderUrl(url: URL) {
  return url.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");
}

export function buildStripeCheckoutSessionParams(
  input: unknown,
  env: SafetyEnv = process.env,
): StripeCheckoutSessionParamsResult {
  const parsed = CreateStripeCheckoutSessionRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_checkout_payload",
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const data = parsed.data;
  const quote = toShippingQuoteDraft(data.quote);
  const now = data.now ? new Date(data.now) : new Date();
  const freshQuote = validateFreshQuoteForPayment(quote, now, data.currentOrderFingerprint);

  if (!freshQuote.ok) {
    return {
      ok: false,
      code: "quote_not_payable",
      issues: [`Quote is not payable: ${freshQuote.reason}.`],
    };
  }

  const currency = normalizedCurrency(quote.currency);
  const metadata = StripeCheckoutMetadataSchema.parse({
    fulfillment_order_id: quote.orderId,
    fulfillment_quote_id: data.quoteId,
    source_order_key: data.sourceOrderKey,
    quote_fingerprint: data.currentOrderFingerprint,
    amount_cents: String(quote.totalCents),
    currency,
    environment: "test",
  });
  const baseUrl = appBaseUrl(env);
  const successUrl = new URL(data.successPath, baseUrl);
  const cancelUrl = new URL(data.cancelPath, baseUrl);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  successUrl.searchParams.set("quote_id", data.quoteId);
  cancelUrl.searchParams.set("quote_id", data.quoteId);

  return {
    ok: true,
    code: "stripe_checkout_params_ready",
    idempotencyKey: `stripe-checkout:${data.quoteId}:${data.currentOrderFingerprint}`,
    params: {
      mode: "payment",
      client_reference_id: data.sourceOrderKey,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: checkoutLineItemName(quote),
              metadata: {
                fulfillment_order_id: quote.orderId,
                fulfillment_quote_id: data.quoteId,
              },
            },
            unit_amount: quote.totalCents,
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: stripeSessionPlaceholderUrl(successUrl),
      cancel_url: cancelUrl.toString(),
    },
  };
}

export function createStripeClient(env: SafetyEnv = process.env): StripeCheckoutSessionClient {
  return new Stripe(stripeCheckoutSecretKey(env), { typescript: true }) as StripeCheckoutSessionClient;
}

export async function createStripeCheckoutSession(
  input: unknown,
  options: {
    env?: SafetyEnv;
    stripeClient?: StripeCheckoutSessionClient;
  } = {},
): Promise<CreateStripeCheckoutSessionResult> {
  const env = options.env ?? process.env;
  const readiness = createStripeCheckoutReadiness(env);

  if (!readiness.ok) {
    return {
      ok: false,
      code: readiness.code as StripeCheckoutBlockingCode,
      issues: readiness.checks.filter((check) => !check.ok).map((check) => check.detail),
    };
  }

  const paramsResult = buildStripeCheckoutSessionParams(input, env);

  if (!paramsResult.ok) {
    return paramsResult;
  }

  const client = options.stripeClient ?? createStripeClient(env);

  try {
    const session = await client.checkout.sessions.create(paramsResult.params, {
      idempotencyKey: paramsResult.idempotencyKey,
    });

    if (session.livemode) {
      return {
        ok: false,
        code: "stripe_live_mode_blocked",
        issues: ["Stripe returned a live-mode checkout session; refusing to continue."],
      };
    }

    if (!session.url) {
      return {
        ok: false,
        code: "stripe_session_create_failed",
        issues: ["Stripe did not return a Checkout URL."],
      };
    }

    return {
      ok: true,
      code: "stripe_checkout_session_created",
      sessionId: session.id,
      url: session.url,
      livemode: false,
    };
  } catch {
    return {
      ok: false,
      code: "stripe_session_create_failed",
      issues: ["Stripe Checkout session creation failed."],
    };
  }
}
