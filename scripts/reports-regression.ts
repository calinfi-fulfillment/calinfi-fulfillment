import assert from "node:assert/strict";

import {
  assertPiiSafeAggregateOutput,
  buildExceptionAgingReport,
  buildFulfillmentSummaryReport,
  buildRoutePerformanceSummary,
} from "../src/lib/reports";

const now = new Date("2026-05-11T00:00:00.000Z");

const summary = buildFulfillmentSummaryReport({
  orders: [
    { orderStatus: "fulfillment_ready", routeType: "REGIONAL_3PL", paymentStatus: "pending" },
    { orderStatus: "manual_hold", routeType: "MANUAL_SPECIAL", paymentStatus: "review_required" },
    { orderStatus: "locked_for_fulfillment", routeType: "CHINA_HK_DIRECT_DDP", paymentStatus: "completed" },
  ],
  handoffs: [
    { routeType: "REGIONAL_3PL", status: "ready" },
    { routeType: "CHINA_HK_DIRECT_DDP", status: "delivered", deliveredAt: now },
  ],
  exceptions: [
    { severity: "blocker", status: "open", createdAt: new Date("2026-05-09T00:00:00.000Z") },
    { severity: "warning", status: "resolved", createdAt: new Date("2026-05-08T00:00:00.000Z") },
  ],
});

assert.deepEqual(summary, {
  readyOrders: 1,
  blockedOrders: 1,
  paymentPending: 1,
  handoffReady: 1,
  openExceptions: 1,
});

const routeSummary = buildRoutePerformanceSummary([
  { routeType: "REGIONAL_3PL", status: "exported", exportedAt: now },
  { routeType: "REGIONAL_3PL", status: "delivered", deliveredAt: now },
  { routeType: "CHINA_HK_DIRECT_DDP", status: "exception" },
]);

assert.equal(routeSummary.find((row) => row.routeType === "REGIONAL_3PL")?.exported, 1);
assert.equal(routeSummary.find((row) => row.routeType === "REGIONAL_3PL")?.delivered, 1);

const aging = buildExceptionAgingReport(
  [
    { severity: "blocker", status: "open", createdAt: new Date("2026-05-08T00:00:00.000Z") },
    { severity: "warning", status: "open", createdAt: new Date("2026-05-10T00:00:00.000Z") },
  ],
  now,
);

assert.deepEqual(aging, {
  open: 2,
  blocker: 1,
  maxAgeDays: 3,
});
assert.equal(assertPiiSafeAggregateOutput({ summary, routeSummary, aging }), true);
assert.equal(assertPiiSafeAggregateOutput({ email: "synthetic@example.test" }), false);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "reports",
      summary,
      aging,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
