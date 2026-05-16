import type { IssueSeverity } from "../domain";
import type { ShippingQuoteDraft } from "../route-quote";
import type { PackagePlanResult, PackagePlanUnit } from "./types";

export type SfcFulfillmentVarianceStatus =
  | "pending_sfc_estimate"
  | "estimate_captured"
  | "final_captured"
  | "needs_review"
  | "blocked";

export type SfcFulfillmentEstimateSnapshot = {
  channelName: string;
  methodCode?: string;
  estimatedShippingFeeCents: number;
  currency: string;
  matchedAtIso: string;
};

export type SfcFinalParcelSnapshot = {
  packageId?: string;
  parcelNo: number;
  trackingNumber?: string;
  actualWeightGrams: number;
  outerLengthMm: number;
  outerWidthMm: number;
  outerHeightMm: number;
  finalShippingFeeCents?: number;
  measuredAtIso?: string;
};

export type SfcFulfillmentActualSnapshot = {
  finalShippingFeeCents: number;
  currency: string;
  measuredAtIso: string;
  parcels: SfcFinalParcelSnapshot[];
};

export type SfcFulfillmentReadOnlySnapshot = {
  provider: "sendfromchina";
  sourceOrderKey: string;
  referenceNo: string;
  packagePlanFingerprint: string;
  capturedAtIso: string;
  estimate?: SfcFulfillmentEstimateSnapshot;
  actual?: SfcFulfillmentActualSnapshot;
  mutation: false;
  containsBackerPii: false;
  externalActions: "none";
};

export type SfcVarianceIssue = {
  code: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  packageId?: string;
};

export type SfcPackageVarianceRow = {
  packageId: string;
  parcelNo?: number;
  plannedBoxSku?: string;
  plannedWeightGrams: number;
  actualWeightGrams?: number;
  weightDeltaGrams?: number;
  plannedDimensionsMm: string;
  actualDimensionsMm?: string;
  trackingNumber?: string;
  status: "pending" | "matched" | "extra_parcel" | "missing_tracking";
};

export type SfcFulfillmentVarianceReport = {
  provider: "sendfromchina";
  referenceNo: string;
  sourceOrderKey: string;
  packagePlanFingerprint: string;
  status: SfcFulfillmentVarianceStatus;
  quote: {
    provider: string;
    currency: string;
    prePaymentTotalCents: number;
    bufferCents: number;
  };
  estimate?: SfcFulfillmentEstimateSnapshot;
  actual?: SfcFulfillmentActualSnapshot;
  summary: {
    plannedPackageCount: number;
    finalPackageCount?: number;
    packageCountDelta?: number;
    plannedWeightGrams: number;
    actualWeightGrams?: number;
    weightDeltaGrams?: number;
    quoteToEstimateDeltaCents?: number;
    estimateToFinalDeltaCents?: number;
    quoteToFinalDeltaCents?: number;
    trackingCount: number;
    missingTrackingCount: number;
  };
  packageRows: SfcPackageVarianceRow[];
  issues: SfcVarianceIssue[];
  mutation: false;
  containsBackerPii: false;
  externalActions: "none";
};

type VarianceThresholds = {
  feeReviewCents: number;
  feeReviewPercent: number;
  weightReviewGrams: number;
  weightReviewPercent: number;
};

const DEFAULT_THRESHOLDS: VarianceThresholds = {
  feeReviewCents: 500,
  feeReviewPercent: 10,
  weightReviewGrams: 500,
  weightReviewPercent: 8,
};

function dimensions(unit: PackagePlanUnit | SfcFinalParcelSnapshot) {
  return `${unit.outerLengthMm}x${unit.outerWidthMm}x${unit.outerHeightMm}`;
}

function percentageDelta(delta: number, base: number) {
  if (base <= 0) return 0;
  return (Math.abs(delta) / base) * 100;
}

function exceedsFeeThreshold(delta: number | undefined, base: number, thresholds: VarianceThresholds) {
  if (delta === undefined) return false;
  return Math.abs(delta) >= thresholds.feeReviewCents || percentageDelta(delta, base) >= thresholds.feeReviewPercent;
}

function exceedsWeightThreshold(delta: number | undefined, base: number, thresholds: VarianceThresholds) {
  if (delta === undefined) return false;
  return Math.abs(delta) >= thresholds.weightReviewGrams || percentageDelta(delta, base) >= thresholds.weightReviewPercent;
}

function pushIssue(issues: SfcVarianceIssue[], issue: SfcVarianceIssue) {
  issues.push(issue);
}

function matchActualParcel(unit: PackagePlanUnit, index: number, parcels: SfcFinalParcelSnapshot[]) {
  return parcels.find((parcel) => parcel.packageId === unit.packageId) ?? parcels[index];
}

function buildPackageRows(plan: PackagePlanResult, actual?: SfcFulfillmentActualSnapshot): SfcPackageVarianceRow[] {
  const actualParcels = actual?.parcels ?? [];
  const rows: SfcPackageVarianceRow[] = plan.packageUnits.map((unit, index) => {
    const parcel = matchActualParcel(unit, index, actualParcels);
    const weightDeltaGrams = parcel ? parcel.actualWeightGrams - unit.totalWeightGrams : undefined;
    const trackingNumber = parcel?.trackingNumber?.trim();

    return {
      packageId: unit.packageId,
      parcelNo: parcel?.parcelNo,
      plannedBoxSku: unit.boxSku,
      plannedWeightGrams: unit.totalWeightGrams,
      actualWeightGrams: parcel?.actualWeightGrams,
      weightDeltaGrams,
      plannedDimensionsMm: dimensions(unit),
      actualDimensionsMm: parcel ? dimensions(parcel) : undefined,
      trackingNumber: trackingNumber || undefined,
      status: parcel ? (trackingNumber ? "matched" : "missing_tracking") : "pending",
    } satisfies SfcPackageVarianceRow;
  });

  const plannedPackageIds = new Set(plan.packageUnits.map((unit) => unit.packageId));
  for (const parcel of actualParcels) {
    if (parcel.packageId && plannedPackageIds.has(parcel.packageId)) continue;
    if (!parcel.packageId && parcel.parcelNo <= plan.packageUnits.length) continue;

    rows.push({
      packageId: parcel.packageId ?? `sfc-extra-${parcel.parcelNo}`,
      parcelNo: parcel.parcelNo,
      plannedWeightGrams: 0,
      actualWeightGrams: parcel.actualWeightGrams,
      weightDeltaGrams: parcel.actualWeightGrams,
      plannedDimensionsMm: "0x0x0",
      actualDimensionsMm: dimensions(parcel),
      trackingNumber: parcel.trackingNumber?.trim() || undefined,
      status: "extra_parcel",
    });
  }

  return rows;
}

export function createSfcFulfillmentVarianceReport({
  plan,
  quote,
  snapshot,
  thresholds = DEFAULT_THRESHOLDS,
}: {
  plan: PackagePlanResult;
  quote: Pick<ShippingQuoteDraft, "provider" | "currency" | "totalCents" | "bufferCents">;
  snapshot: SfcFulfillmentReadOnlySnapshot;
  thresholds?: Partial<VarianceThresholds>;
}): SfcFulfillmentVarianceReport {
  const resolvedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const issues: SfcVarianceIssue[] = [];
  const estimate = snapshot.estimate;
  const actual = snapshot.actual;
  const plannedWeightGrams = plan.summary.totalWeightGrams;
  const actualWeightGrams = actual?.parcels.reduce((sum, parcel) => sum + parcel.actualWeightGrams, 0);
  const weightDeltaGrams = actualWeightGrams === undefined ? undefined : actualWeightGrams - plannedWeightGrams;
  const quoteToEstimateDeltaCents = estimate ? estimate.estimatedShippingFeeCents - quote.totalCents : undefined;
  const estimateToFinalDeltaCents =
    estimate && actual ? actual.finalShippingFeeCents - estimate.estimatedShippingFeeCents : undefined;
  const quoteToFinalDeltaCents = actual ? actual.finalShippingFeeCents - quote.totalCents : undefined;
  const finalPackageCount = actual?.parcels.length;
  const packageCountDelta = finalPackageCount === undefined ? undefined : finalPackageCount - plan.summary.packageCount;
  const packageRows = buildPackageRows(plan, actual);
  const trackingCount = packageRows.filter((row) => row.trackingNumber).length;
  const missingTrackingCount = actual ? Math.max(0, actual.parcels.length - trackingCount) : 0;

  if (snapshot.packagePlanFingerprint !== plan.fingerprint) {
    pushIssue(issues, {
      code: "package_plan_fingerprint_mismatch",
      severity: "blocker",
      title: "SFC snapshot does not match Package Plan",
      detail: "The read-only SFC snapshot fingerprint differs from the current package plan fingerprint.",
    });
  }

  if (snapshot.sourceOrderKey !== plan.sourceOrderKey) {
    pushIssue(issues, {
      code: "source_order_key_mismatch",
      severity: "blocker",
      title: "SFC snapshot does not match source order",
      detail: "The SFC reference is linked to a different source order key.",
    });
  }

  if (estimate && estimate.currency !== quote.currency) {
    pushIssue(issues, {
      code: "estimate_currency_mismatch",
      severity: "blocker",
      title: "SFC estimate currency mismatch",
      detail: `Expected ${quote.currency}, got ${estimate.currency}.`,
    });
  }

  if (actual && actual.currency !== quote.currency) {
    pushIssue(issues, {
      code: "actual_currency_mismatch",
      severity: "blocker",
      title: "SFC actual currency mismatch",
      detail: `Expected ${quote.currency}, got ${actual.currency}.`,
    });
  }

  if (!estimate) {
    pushIssue(issues, {
      code: "sfc_estimate_pending",
      severity: "info",
      title: "SFC post-upload estimate pending",
      detail: "Capture the post-upload shipping-channel estimate after SFC matches the order to a method.",
    });
  }

  if (exceedsFeeThreshold(quoteToEstimateDeltaCents, quote.totalCents, resolvedThresholds)) {
    pushIssue(issues, {
      code: "quote_to_estimate_delta_review",
      severity: "warning",
      title: "Pre-payment quote differs from SFC estimate",
      detail: "The SFC post-upload estimate variance exceeds the review threshold.",
    });
  }

  if (exceedsFeeThreshold(estimateToFinalDeltaCents, estimate?.estimatedShippingFeeCents ?? quote.totalCents, resolvedThresholds)) {
    pushIssue(issues, {
      code: "estimate_to_final_delta_review",
      severity: "warning",
      title: "SFC estimate differs from final actual",
      detail: "The final measured shipping fee variance exceeds the review threshold.",
    });
  }

  if (packageCountDelta !== undefined && packageCountDelta !== 0) {
    pushIssue(issues, {
      code: "package_count_delta_review",
      severity: "warning",
      title: "Final parcel count differs from Package Plan",
      detail: `Package Plan had ${plan.summary.packageCount}; SFC final snapshot has ${finalPackageCount}.`,
    });
  }

  if (exceedsWeightThreshold(weightDeltaGrams, plannedWeightGrams, resolvedThresholds)) {
    pushIssue(issues, {
      code: "package_weight_delta_review",
      severity: "warning",
      title: "Final measured weight differs from Package Plan",
      detail: "The final parcel weight variance exceeds the review threshold.",
    });
  }

  if (missingTrackingCount > 0) {
    pushIssue(issues, {
      code: "tracking_number_missing",
      severity: "warning",
      title: "Tracking number missing",
      detail: `${missingTrackingCount} final SFC parcel(s) do not have tracking numbers yet.`,
    });
  }

  const hasBlocker = issues.some((issue) => issue.severity === "blocker");
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const status: SfcFulfillmentVarianceStatus = hasBlocker
    ? "blocked"
    : hasWarning
      ? "needs_review"
      : actual
        ? "final_captured"
        : estimate
          ? "estimate_captured"
          : "pending_sfc_estimate";

  return {
    provider: "sendfromchina",
    referenceNo: snapshot.referenceNo,
    sourceOrderKey: snapshot.sourceOrderKey,
    packagePlanFingerprint: snapshot.packagePlanFingerprint,
    status,
    quote: {
      provider: quote.provider,
      currency: quote.currency,
      prePaymentTotalCents: quote.totalCents,
      bufferCents: quote.bufferCents,
    },
    estimate,
    actual,
    summary: {
      plannedPackageCount: plan.summary.packageCount,
      finalPackageCount,
      packageCountDelta,
      plannedWeightGrams,
      actualWeightGrams,
      weightDeltaGrams,
      quoteToEstimateDeltaCents,
      estimateToFinalDeltaCents,
      quoteToFinalDeltaCents,
      trackingCount,
      missingTrackingCount,
    },
    packageRows,
    issues,
    mutation: false,
    containsBackerPii: false,
    externalActions: "none",
  };
}
