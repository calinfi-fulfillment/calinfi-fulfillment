import { z } from "zod";

import { FulfillmentRouteTypeSchema, QuoteStatusSchema, ShippingModeSchema } from "../domain";

export const PaymentQuoteSchema = z.object({
  orderId: z.string().uuid(),
  routeType: FulfillmentRouteTypeSchema,
  shippingMode: ShippingModeSchema,
  provider: z.string().min(1),
  providerQuoteId: z.string().optional(),
  status: QuoteStatusSchema,
  currency: z.string().length(3),
  amountCents: z.number().int().nonnegative(),
  bufferCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  expiresAt: z.string().datetime(),
  orderFingerprint: z.string().min(1),
});

export const QuoteValidationRequestSchema = z.object({
  quote: PaymentQuoteSchema,
  currentOrderFingerprint: z.string().min(1),
  now: z.string().datetime().optional(),
});

export const StripeCheckoutMetadataSchema = z.object({
  fulfillment_order_id: z.string().uuid(),
  fulfillment_quote_id: z.string().uuid(),
  source_order_key: z.string().startsWith("pm:"),
  quote_fingerprint: z.string().min(1),
  amount_cents: z.string().regex(/^\d+$/),
  currency: z.string().length(3),
  environment: z.enum(["test", "live"]),
});

export type QuoteValidationRequest = z.infer<typeof QuoteValidationRequestSchema>;
export type PaymentQuote = z.infer<typeof PaymentQuoteSchema>;
export type StripeCheckoutMetadata = z.infer<typeof StripeCheckoutMetadataSchema>;
