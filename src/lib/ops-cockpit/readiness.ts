import { summarizeProductReadiness, type ProductReadinessResult } from "../product-readiness";

export function productReadinessCockpitQueue(results: ProductReadinessResult[]) {
  const summary = summarizeProductReadiness(results);

  return {
    key: "product-readiness",
    title: "Product Readiness",
    summary,
    summaryText: `${summary.ready} ready, ${summary.needsReview} review, ${summary.blocked} blocked.`,
    nextAction:
      summary.blocked > 0
        ? "Review blocker SKUs before quote generation."
        : summary.needsReview > 0
          ? "Review unknown weight, dimensions, or customs fields."
          : "No product readiness blockers.",
  };
}
