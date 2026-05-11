import { z } from "zod";

import { DecisionStatusSchema, OrderStatusSchema } from "../domain";
import { QuoteValidationRequestSchema } from "../payment-contract";

export const PaymentEventPayloadSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.enum(["stripe.checkout.session.completed", "owner.covered_payment.approved"]),
  orderId: z.string().uuid(),
  quoteId: z.string().uuid(),
  sourceOrderKey: z.string().startsWith("pm:"),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  orderStatusBefore: OrderStatusSchema,
  decisionStatusBefore: DecisionStatusSchema,
  quote: QuoteValidationRequestSchema.shape.quote,
  currentOrderFingerprint: z.string().min(1),
  ownerApproved: z.boolean().optional(),
  now: z.string().datetime().optional(),
});

export type PaymentEventPayload = z.infer<typeof PaymentEventPayloadSchema>;
