import { z } from "zod";

import { AddressStatusSchema, LineRoleSchema, OrderStatusSchema } from "../domain";

export const PmIntakeBackerSchema = z.object({
  pmBackerId: z.string().uuid().optional(),
  sourceBackerKey: z.string().min(1).optional(),
  backerNumber: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  locale: z.string().optional(),
});

export const PmIntakeLineSchema = z.object({
  sourceLineKey: z.string().min(1).optional(),
  lineRole: LineRoleSchema,
  sku: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  rewardCode: z.string().optional(),
  addOnId: z.string().optional(),
  isBuiltinMainBoxItem: z.boolean().optional(),
  unitValueCents: z.number().int().nonnegative().optional(),
  unitValueCurrency: z.string().length(3).optional(),
});

export const PmIntakePayloadSchema = z.object({
  pledgeId: z.string().uuid(),
  orderNumber: z.string().optional(),
  orderStatus: OrderStatusSchema.default("selection_submitted"),
  addressStatus: AddressStatusSchema.default("missing"),
  backer: PmIntakeBackerSchema,
  recipientSnapshot: z.record(z.string(), z.unknown()).default({}),
  orderSnapshot: z.record(z.string(), z.unknown()).default({}),
  lines: z.array(PmIntakeLineSchema).min(1),
});

export type PmIntakePayload = z.infer<typeof PmIntakePayloadSchema>;
export type PmIntakeLine = z.infer<typeof PmIntakeLineSchema>;
