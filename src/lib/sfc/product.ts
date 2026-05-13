import { z } from "zod";

import type { IssueSeverity, ProductReadinessStatus } from "../domain";
import { ProductSchema } from "../domain";
import type { NetworkRouteFamily } from "../network-plan";
import { evaluateProductReadiness, type ProductReadinessIssue } from "../product-readiness";

const CUSTOMS_FIELDS = ["hsCode", "countryOfOrigin", "customsDescription", "declaredValueCents", "declaredValueCurrency"] as const;

type SfcProductSyncIssue = ProductReadinessIssue & {
  source: "product_master" | "sfc_stock" | "sfc_customs";
};

export type SfcProductSyncInput = z.input<typeof ProductSchema> & {
  requiredQuantity?: number;
  stockOnHand?: number;
};

export type SfcProductSyncContext = {
  routeFamily: NetworkRouteFamily;
  warehouseId?: number;
};

export type SfcProductSyncLine = {
  sku: string;
  title: string;
  routeFamily: NetworkRouteFamily;
  warehouseId?: number;
  syncRequired: boolean;
  status: ProductReadinessStatus;
  requiredQuantity: number;
  stockOnHand?: number;
  payloadReady: boolean;
  payloadPreview: {
    sku: string;
    title: string;
    weightKg?: number;
    dimensionsCm?: {
      length: number;
      width: number;
      height: number;
    };
    customs?: {
      hsCode: string;
      countryOfOrigin: string;
      description: string;
      declaredValue: number;
      currency: string;
    };
  } | null;
  issues: SfcProductSyncIssue[];
  externalActions: "none";
};

export type SfcProductSyncSummary = {
  ready: number;
  needsReview: number;
  blocked: number;
  syncRequired: number;
  externalActions: "none";
};

function missing(value: unknown) {
  return value === null || value === undefined || value === "";
}

function sfcIssue(code: string, severity: IssueSeverity, field: string, title: string, detail: string, source: SfcProductSyncIssue["source"]) {
  return { code, severity, field, title, detail, source };
}

function hasCustomsFields(product: ReturnType<typeof ProductSchema.parse>) {
  return CUSTOMS_FIELDS.every((field) => !missing(product[field]));
}

function createPayloadPreview(product: ReturnType<typeof ProductSchema.parse>): SfcProductSyncLine["payloadPreview"] {
  const dimensionsReady = product.lengthMm && product.widthMm && product.heightMm;
  const customsReady = hasCustomsFields(product);

  return {
    sku: product.sku,
    title: product.title,
    weightKg: product.weightGrams ? product.weightGrams / 1000 : undefined,
    dimensionsCm: dimensionsReady
      ? {
          length: product.lengthMm! / 10,
          width: product.widthMm! / 10,
          height: product.heightMm! / 10,
        }
      : undefined,
    customs: customsReady
      ? {
          hsCode: product.hsCode!,
          countryOfOrigin: product.countryOfOrigin!,
          description: product.customsDescription!,
          declaredValue: product.declaredValueCents! / 100,
          currency: product.declaredValueCurrency!,
        }
      : undefined,
  };
}

export function createSfcProductSyncLine(input: SfcProductSyncInput, context: SfcProductSyncContext): SfcProductSyncLine {
  const product = ProductSchema.parse(input);
  const syncRequired = context.routeFamily !== "MANUAL_SPECIAL" && !product.isBuiltinMainBoxItem;
  const routeType = context.routeFamily === "SFC_ASIA_DIRECT_DDP" ? "CHINA_HK_DIRECT_DDP" : "REGIONAL_3PL";
  const productReadiness = evaluateProductReadiness(product, { routeType });
  const issues: SfcProductSyncIssue[] = productReadiness.issues.map((issue) => ({ ...issue, source: "product_master" }));
  const requiredQuantity = input.requiredQuantity ?? 1;

  if (!syncRequired) {
    return {
      sku: product.sku,
      title: product.title,
      routeFamily: context.routeFamily,
      warehouseId: context.warehouseId,
      syncRequired,
      status: "ready",
      requiredQuantity,
      stockOnHand: input.stockOnHand,
      payloadReady: false,
      payloadPreview: null,
      issues,
      externalActions: "none",
    };
  }

  if (missing(input.stockOnHand)) {
    issues.push(
      sfcIssue(
        "sfc_stock_unknown",
        "warning",
        "stockOnHand",
        "SFC stock not verified",
        "SFC stock is not known in this local preview.",
        "sfc_stock",
      ),
    );
  } else if (input.stockOnHand! < requiredQuantity) {
    issues.push(
      sfcIssue(
        "sfc_stock_short",
        "blocker",
        "stockOnHand",
        "SFC stock is short",
        "Required quantity exceeds the synthetic SFC stock snapshot.",
        "sfc_stock",
      ),
    );
  }

  if (context.routeFamily !== "SFC_ASIA_DIRECT_DDP") {
    for (const field of CUSTOMS_FIELDS) {
      if (missing(product[field])) {
        issues.push(
          sfcIssue(
            "sfc_customs_review_required",
            "warning",
            field,
            "SFC customs field needs review",
            `${field} should be ready before SFC freight or regional handoff planning.`,
            "sfc_customs",
          ),
        );
      }
    }
  }

  const hasBlocker = issues.some((issue) => issue.severity === "blocker");
  const status: ProductReadinessStatus = hasBlocker ? "blocked" : issues.length > 0 ? "needs_review" : "ready";
  const payloadReady = status === "ready";

  return {
    sku: product.sku,
    title: product.title,
    routeFamily: context.routeFamily,
    warehouseId: context.warehouseId,
    syncRequired,
    status,
    requiredQuantity,
    stockOnHand: input.stockOnHand,
    payloadReady,
    payloadPreview: payloadReady ? createPayloadPreview(product) : null,
    issues,
    externalActions: "none",
  };
}

export function createSfcProductSyncPreview(inputs: readonly SfcProductSyncInput[], context: SfcProductSyncContext) {
  const lines = inputs.map((input) => createSfcProductSyncLine(input, context));
  const summary: SfcProductSyncSummary = {
    ready: lines.filter((line) => line.status === "ready").length,
    needsReview: lines.filter((line) => line.status === "needs_review").length,
    blocked: lines.filter((line) => line.status === "blocked").length,
    syncRequired: lines.filter((line) => line.syncRequired).length,
    externalActions: "none",
  };

  return {
    provider: "sendfromchina" as const,
    routeFamily: context.routeFamily,
    warehouseId: context.warehouseId,
    lines,
    summary,
    externalActions: "none" as const,
  };
}
