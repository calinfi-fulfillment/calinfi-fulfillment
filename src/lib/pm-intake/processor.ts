import { BUILT_IN_SKUS, type LineRole, type ProductReadinessStatus } from "../domain";
import type { PmIntakeLine, PmIntakePayload } from "./schema";

export type ProductCatalogEntry = {
  sku: string;
  title: string;
  readinessStatus: ProductReadinessStatus;
  isBuiltinMainBoxItem?: boolean;
};

export type IntakeIssue = {
  severity: "warning" | "blocker";
  code: string;
  title: string;
  detail: string;
  sku?: string;
};

export type PlannedOrderLine = {
  sourceLineKey: string;
  sku: string;
  title: string;
  quantity: number;
  lineRole: LineRole;
  isVisible: boolean;
  isPhysical: boolean;
  isBuiltinMainBoxItem: boolean;
};

export type PlannedExcludedBuiltinItem = {
  sourceLineKey: string;
  sku: string;
  quantity: number;
  exclusionReason: "built_in_main_box_item";
};

export type PmIntakePlan = {
  sourceBackerKey: string;
  sourceOrderKey: string;
  orderStatus: PmIntakePayload["orderStatus"];
  addressStatus: PmIntakePayload["addressStatus"];
  orderLines: PlannedOrderLine[];
  excludedBuiltinItems: PlannedExcludedBuiltinItem[];
  issues: IntakeIssue[];
  blocked: boolean;
};

function defaultBackerSourceKey(payload: PmIntakePayload) {
  return payload.backer.sourceBackerKey ?? `pm:${payload.backer.pmBackerId ?? payload.pledgeId}`;
}

export function buildPmSourceLineKey(pledgeId: string, line: PmIntakeLine) {
  if (line.sourceLineKey) return line.sourceLineKey;

  if (line.lineRole === "reward" || line.lineRole === "builtin") {
    return `pm:${pledgeId}:reward:${line.rewardCode ?? "unknown"}:${line.sku}:${line.lineRole}`;
  }

  if (line.lineRole === "addon") {
    return `pm:${pledgeId}:addon:${line.addOnId ?? line.sku}:${line.sku}`;
  }

  return `pm:${pledgeId}:prepaid:${line.sku}`;
}

export function isBuiltinLine(line: PmIntakeLine, product?: ProductCatalogEntry) {
  return Boolean(
    line.isBuiltinMainBoxItem ||
      product?.isBuiltinMainBoxItem ||
      BUILT_IN_SKUS.includes(line.sku as (typeof BUILT_IN_SKUS)[number]),
  );
}

export function buildPmIntakePlan(payload: PmIntakePayload, products: ProductCatalogEntry[]): PmIntakePlan {
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const issues: IntakeIssue[] = [];
  const orderLines: PlannedOrderLine[] = [];
  const excludedBuiltinItems: PlannedExcludedBuiltinItem[] = [];

  for (const line of payload.lines) {
    const product = productBySku.get(line.sku);
    const sourceLineKey = buildPmSourceLineKey(payload.pledgeId, line);

    if (!product) {
      issues.push({
        severity: "blocker",
        code: "missing_product_master_sku",
        title: "Missing Product Master SKU",
        detail: `SKU ${line.sku} is not present in Fulfillment Product Master.`,
        sku: line.sku,
      });
    } else if (product.readinessStatus !== "ready") {
      issues.push({
        severity: "warning",
        code: "product_needs_review",
        title: "Product Master Review Needed",
        detail: `SKU ${line.sku} is marked ${product.readinessStatus}.`,
        sku: line.sku,
      });
    }

    const builtin = isBuiltinLine(line, product);

    orderLines.push({
      sourceLineKey,
      sku: line.sku,
      title: line.title,
      quantity: line.quantity,
      lineRole: line.lineRole,
      isVisible: true,
      isPhysical: !builtin,
      isBuiltinMainBoxItem: builtin,
    });

    if (builtin) {
      excludedBuiltinItems.push({
        sourceLineKey,
        sku: line.sku,
        quantity: line.quantity,
        exclusionReason: "built_in_main_box_item",
      });
    }
  }

  return {
    sourceBackerKey: defaultBackerSourceKey(payload),
    sourceOrderKey: `pm:${payload.pledgeId}`,
    orderStatus: payload.orderStatus,
    addressStatus: payload.addressStatus,
    orderLines,
    excludedBuiltinItems,
    issues,
    blocked: issues.some((issue) => issue.severity === "blocker"),
  };
}
