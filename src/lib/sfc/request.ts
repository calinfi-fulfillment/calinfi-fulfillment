import { z } from "zod";

import type { SafetyEnv } from "../safety";
import { sfcWsdlUrl } from "./config";

export type SfcSoapAction = "getWarehouse" | "getShippingMethod" | "getRate" | "getRateByMode" | "getStock" | "createOrder" | "createASN";

export type SfcSoapRequestPlan = {
  provider: "sendfromchina";
  action: SfcSoapAction;
  method: "POST";
  url: string;
  headers: Record<string, string>;
  body: string;
  mutation: boolean;
  externalActions: "none";
};

export const SfcRateRequestSchema = z.object({
  country: z.string().min(2),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  warehouseId: z.number().int().positive().optional(),
  shippingMethodCode: z.string().min(1).optional(),
  priceType: z.enum(["1", "2"]).default("1"),
});

export type SfcRateRequest = z.infer<typeof SfcRateRequestSchema>;

export const SfcStockRequestSchema = z.object({
  sku: z.string().min(1).optional(),
  warehouseId: z.number().int().positive().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type SfcStockRequest = z.infer<typeof SfcStockRequestSchema>;

export const SfcOrderPreviewSchema = z.object({
  referenceNo: z.string().min(1).max(32),
  warehouseId: z.number().int().positive().optional(),
  country: z.string().min(2),
  shippingMethodCode: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  returnable: z.boolean().default(false),
  iossNo: z.string().optional(),
  lines: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().positive(),
      description: z.string().min(1),
      declaredValue: z.number().nonnegative(),
    }),
  ),
});

export type SfcOrderPreview = z.infer<typeof SfcOrderPreviewSchema>;

export const SfcAsnPreviewSchema = z.object({
  referenceNo: z.string().min(1).max(32),
  warehouseId: z.number().int().positive().optional(),
  trackingNumber: z.string().optional(),
  lines: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
});

export type SfcAsnPreview = z.infer<typeof SfcAsnPreviewSchema>;

function escapeXml(value: string | number | boolean | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function headerXml() {
  return `<HeaderRequest><customerId>&lt;configured&gt;</customerId><appToken>&lt;configured&gt;</appToken><appKey>&lt;configured&gt;</appKey><langId>2</langId></HeaderRequest>`;
}

function envelope(action: SfcSoapAction, innerXml: string) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cff="http://www.chinafulfill.com/CffSvc/">`,
    `<soapenv:Header/>`,
    `<soapenv:Body>`,
    `<cff:${action}Request>${headerXml()}${innerXml}</cff:${action}Request>`,
    `</soapenv:Body>`,
    `</soapenv:Envelope>`,
  ].join("");
}

function plan(action: SfcSoapAction, body: string, mutation: boolean, env: SafetyEnv = process.env): SfcSoapRequestPlan {
  return {
    provider: "sendfromchina",
    action,
    method: "POST",
    url: sfcWsdlUrl(env),
    headers: {
      "content-type": "text/xml; charset=utf-8",
      SOAPAction: action,
    },
    body,
    mutation,
    externalActions: "none",
  };
}

export function buildSfcGetWarehousePlan(env?: SafetyEnv) {
  return plan("getWarehouse", envelope("getWarehouse", ""), false, env);
}

export function buildSfcGetShippingMethodPlan(input: { warehouseId?: number }, env?: SafetyEnv) {
  const innerXml = input.warehouseId ? `<warehouseId>${escapeXml(input.warehouseId)}</warehouseId>` : "";
  return plan("getShippingMethod", envelope("getShippingMethod", innerXml), false, env);
}

export function buildSfcRatePlan(input: SfcRateRequest, env?: SafetyEnv) {
  const parsed = SfcRateRequestSchema.parse(input);
  const action: SfcSoapAction = parsed.shippingMethodCode ? "getRateByMode" : "getRate";
  const maybeShippingMethod = parsed.shippingMethodCode ? `<shippingmethod>${escapeXml(parsed.shippingMethodCode)}</shippingmethod>` : "";
  const maybeWarehouse = parsed.warehouseId ? `<warehouseId>${escapeXml(parsed.warehouseId)}</warehouseId>` : "";
  const innerXml = [
    `<ratesRequestInfo>`,
    `<country>${escapeXml(parsed.country)}</country>`,
    maybeShippingMethod,
    `<weight>${escapeXml(parsed.weightKg)}</weight>`,
    parsed.lengthCm ? `<length>${escapeXml(parsed.lengthCm)}</length>` : "",
    parsed.widthCm ? `<width>${escapeXml(parsed.widthCm)}</width>` : "",
    parsed.heightCm ? `<height>${escapeXml(parsed.heightCm)}</height>` : "",
    maybeWarehouse,
    `<priceType>${escapeXml(parsed.priceType)}</priceType>`,
    `</ratesRequestInfo>`,
  ].join("");

  return plan(action, envelope(action, innerXml), false, env);
}

export function buildSfcStockPlan(input: SfcStockRequest, env?: SafetyEnv) {
  const parsed = SfcStockRequestSchema.parse(input);
  const innerXml = [
    parsed.sku ? `<sku>${escapeXml(parsed.sku)}</sku>` : "",
    parsed.warehouseId ? `<warehouseId>${escapeXml(parsed.warehouseId)}</warehouseId>` : "",
    `<steps><pageSize>${escapeXml(parsed.pageSize)}</pageSize><page>${escapeXml(parsed.page)}</page></steps>`,
  ].join("");

  return plan("getStock", envelope("getStock", innerXml), false, env);
}

export function buildSfcCreateOrderPreviewPlan(input: SfcOrderPreview, env?: SafetyEnv) {
  const parsed = SfcOrderPreviewSchema.parse(input);
  const detailXml = parsed.lines
    .map(
      (line) =>
        `<orderDetail><sku>${escapeXml(line.sku)}</sku><quantity>${escapeXml(line.quantity)}</quantity><op_description>${escapeXml(
          line.description,
        )}</op_description><refWorth>${escapeXml(line.declaredValue)}</refWorth></orderDetail>`,
    )
    .join("");
  const innerXml = [
    `<orderInfo>`,
    `<referenceNo>${escapeXml(parsed.referenceNo)}</referenceNo>`,
    parsed.warehouseId ? `<warehouseId>${escapeXml(parsed.warehouseId)}</warehouseId>` : "",
    `<consigneeFirstName>&lt;redacted&gt;</consigneeFirstName>`,
    `<consigneeLastName>&lt;redacted&gt;</consigneeLastName>`,
    `<consigneeCountry>${escapeXml(parsed.country)}</consigneeCountry>`,
    `<shippingMethodCode>${escapeXml(parsed.shippingMethodCode)}</shippingMethodCode>`,
    `<consigneeZip>&lt;redacted:${escapeXml(parsed.postalCode.length)} chars&gt;</consigneeZip>`,
    `<consigneeCity>&lt;redacted:${escapeXml(parsed.city.length)} chars&gt;</consigneeCity>`,
    parsed.state ? `<consigneeState>&lt;redacted:${escapeXml(parsed.state.length)} chars&gt;</consigneeState>` : "",
    `<consigneeAddress1>&lt;redacted&gt;</consigneeAddress1>`,
    `<returnable>${parsed.returnable ? 1 : 0}</returnable>`,
    parsed.iossNo ? `<iossNo>&lt;redacted&gt;</iossNo>` : "",
    detailXml,
    `</orderInfo>`,
  ].join("");

  return plan("createOrder", envelope("createOrder", innerXml), true, env);
}

export function buildSfcCreateAsnPreviewPlan(input: SfcAsnPreview, env?: SafetyEnv) {
  const parsed = SfcAsnPreviewSchema.parse(input);
  const detailXml = parsed.lines
    .map((line) => `<ASNDetail><sku>${escapeXml(line.sku)}</sku><quantity>${escapeXml(line.quantity)}</quantity></ASNDetail>`)
    .join("");
  const innerXml = [
    `<ASNInfo>`,
    `<referenceNo>${escapeXml(parsed.referenceNo)}</referenceNo>`,
    parsed.trackingNumber ? `<trackingNumber>&lt;redacted&gt;</trackingNumber>` : "",
    `<ASNType>1</ASNType>`,
    parsed.warehouseId ? `<warehouseId>${escapeXml(parsed.warehouseId)}</warehouseId>` : "",
    detailXml,
    `</ASNInfo>`,
  ].join("");

  return plan("createASN", envelope("createASN", innerXml), true, env);
}
