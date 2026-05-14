import { z } from "zod";

import type { QuoteRequest } from "../route-quote";
import { easyshipApiBaseUrl, easyshipApiToken } from "./config";

export const EasyshipAddressSchema = z.object({
  country_alpha2: z.string().length(2),
  line_1: z.string().min(1),
  line_2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().min(1),
  contact_name: z.string().optional(),
  company_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
});

export const EasyshipParcelBoxSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["cm", "in"]),
});

export const EasyshipRatePlanInputSchema = z.object({
  quoteRequest: z.custom<QuoteRequest>(),
  originAddress: EasyshipAddressSchema,
  destinationAddress: EasyshipAddressSchema,
  box: EasyshipParcelBoxSchema,
  totalActualWeightKg: z.number().positive(),
  incoterms: z.enum(["DDU", "DDP"]).default("DDU"),
  calculateTaxAndDuties: z.boolean().default(false),
});

export type EasyshipRatePlanInput = z.infer<typeof EasyshipRatePlanInputSchema>;

export type EasyshipHttpRequestPlan = {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  externalActions: "none";
};

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function easyshipItemFromLine(line: QuoteRequest["lines"][number], currency: string) {
  return {
    description: line.sku,
    sku: line.sku,
    quantity: line.quantity,
    hs_code: "732189",
    declared_currency: currency,
    declared_customs_value: 10,
    actual_weight: line.weightGrams ? Math.max(line.weightGrams / 1000, 0.001) : undefined,
  };
}

export function buildEasyshipRatesBody(input: EasyshipRatePlanInput) {
  const parsed = EasyshipRatePlanInputSchema.parse(input);
  const box = {
    length: parsed.box.length,
    width: parsed.box.width,
    height: parsed.box.height,
  };

  return {
    origin_address: parsed.originAddress,
    destination_address: parsed.destinationAddress,
    incoterms: parsed.incoterms,
    calculate_tax_and_duties: parsed.calculateTaxAndDuties,
    parcels: [
      {
        total_actual_weight: parsed.totalActualWeightKg,
        box,
        items: parsed.quoteRequest.lines.map((line) => easyshipItemFromLine(line, parsed.quoteRequest.currency)),
      },
    ],
  };
}

export function buildEasyshipRatesRequestPlan(
  input: EasyshipRatePlanInput,
  env: Partial<Record<string, string | undefined>> = process.env,
): EasyshipHttpRequestPlan {
  const token = easyshipApiToken(env);

  return {
    method: "POST",
    url: endpoint(easyshipApiBaseUrl(env), "/rates"),
    headers: {
      authorization: token ? "Bearer <configured>" : "Bearer <missing>",
      "content-type": "application/json",
    },
    body: buildEasyshipRatesBody(input),
    externalActions: "none",
  };
}

export function buildEasyshipShipmentRequestPlan(
  input: EasyshipRatePlanInput & { idempotencyKey: string; platformOrderNumber: string },
  env: Partial<Record<string, string | undefined>> = process.env,
): EasyshipHttpRequestPlan {
  const token = easyshipApiToken(env);

  return {
    method: "POST",
    url: endpoint(easyshipApiBaseUrl(env), "/shipments"),
    headers: {
      authorization: token ? "Bearer <configured>" : "Bearer <missing>",
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: {
      ...buildEasyshipRatesBody(input),
      metadata: {
        fulfillment_order_id: input.quoteRequest.orderId,
        platform_order_number: input.platformOrderNumber,
      },
      order_data: {
        platform_order_number: input.platformOrderNumber,
      },
    },
    externalActions: "none",
  };
}
