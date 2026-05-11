import { ProductSchema, type FulfillmentRouteType, type IssueSeverity, type ProductReadinessStatus } from "../domain";

const PHYSICAL_REVIEW_FIELDS = ["weightGrams", "lengthMm", "widthMm", "heightMm"] as const;
const DDP_BLOCKER_FIELDS = [
  "hsCode",
  "countryOfOrigin",
  "customsDescription",
  "declaredValueCents",
  "declaredValueCurrency",
] as const;

export type ProductReadinessInput = Parameters<typeof ProductSchema.parse>[0];

export type ProductReadinessContext = {
  routeType?: FulfillmentRouteType;
};

export type ProductReadinessIssue = {
  code: string;
  severity: IssueSeverity;
  field: string;
  title: string;
  detail: string;
};

export type ProductReadinessResult = {
  sku: string;
  status: ProductReadinessStatus;
  issues: ProductReadinessIssue[];
};

function isMissing(value: unknown) {
  return value === null || value === undefined || value === "";
}

function issueForMissingField(field: string, severity: IssueSeverity): ProductReadinessIssue {
  return {
    code: severity === "blocker" ? "missing_ddp_customs_field" : "missing_packaging_field",
    severity,
    field,
    title: severity === "blocker" ? "DDP customs field missing" : "Packaging field needs review",
    detail: `${field} is required for this readiness gate.`,
  };
}

export function evaluateProductReadiness(productInput: ProductReadinessInput, context: ProductReadinessContext = {}): ProductReadinessResult {
  const product = ProductSchema.parse(productInput);
  const issues: ProductReadinessIssue[] = [];

  if (product.readinessStatus === "blocked") {
    issues.push({
      code: "product_marked_blocked",
      severity: "blocker",
      field: "readinessStatus",
      title: "Product is blocked",
      detail: "Product Master marks this SKU as blocked.",
    });
  }

  if (product.readinessStatus === "needs_review") {
    issues.push({
      code: "product_marked_needs_review",
      severity: "warning",
      field: "readinessStatus",
      title: "Product needs review",
      detail: "Product Master marks this SKU as needs_review.",
    });
  }

  if (!product.isBuiltinMainBoxItem) {
    for (const field of PHYSICAL_REVIEW_FIELDS) {
      if (isMissing(product[field])) {
        issues.push(issueForMissingField(field, "warning"));
      }
    }
  }

  if (context.routeType === "CHINA_HK_DIRECT_DDP") {
    for (const field of DDP_BLOCKER_FIELDS) {
      if (isMissing(product[field])) {
        issues.push(issueForMissingField(field, "blocker"));
      }
    }
  }

  const hasBlocker = issues.some((issue) => issue.severity === "blocker");
  const status: ProductReadinessStatus = hasBlocker ? "blocked" : issues.length > 0 ? "needs_review" : "ready";

  return {
    sku: product.sku,
    status,
    issues,
  };
}

export function summarizeProductReadiness(results: ProductReadinessResult[]) {
  return {
    ready: results.filter((result) => result.status === "ready").length,
    needsReview: results.filter((result) => result.status === "needs_review").length,
    blocked: results.filter((result) => result.status === "blocked").length,
  };
}
