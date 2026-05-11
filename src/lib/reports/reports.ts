import type { FulfillmentRouteType, HandoffStatus, IssueSeverity, OrderStatus } from "../domain";

export type ReportOrder = {
  orderStatus: OrderStatus;
  routeType: FulfillmentRouteType;
  paymentStatus: "completed" | "covered_approved" | "pending" | "review_required";
};

export type ReportHandoff = {
  routeType: FulfillmentRouteType;
  status: HandoffStatus;
  exportedAt?: Date;
  deliveredAt?: Date;
};

export type ReportException = {
  severity: IssueSeverity;
  status: "open" | "resolved" | "voided";
  createdAt: Date;
};

export function buildFulfillmentSummaryReport(input: {
  orders: ReportOrder[];
  handoffs: ReportHandoff[];
  exceptions: ReportException[];
}) {
  return {
    readyOrders: input.orders.filter((order) => order.orderStatus === "fulfillment_ready").length,
    blockedOrders: input.orders.filter((order) => order.orderStatus === "manual_hold").length,
    paymentPending: input.orders.filter((order) => order.paymentStatus === "pending").length,
    handoffReady: input.handoffs.filter((handoff) => handoff.status === "ready").length,
    openExceptions: input.exceptions.filter((exception) => exception.status === "open").length,
  };
}

export function buildRoutePerformanceSummary(handoffs: ReportHandoff[]) {
  const byRoute = new Map<FulfillmentRouteType, { exported: number; delivered: number }>();

  for (const handoff of handoffs) {
    const current = byRoute.get(handoff.routeType) ?? { exported: 0, delivered: 0 };
    if (handoff.status === "exported" || handoff.exportedAt) current.exported += 1;
    if (handoff.status === "delivered" || handoff.deliveredAt) current.delivered += 1;
    byRoute.set(handoff.routeType, current);
  }

  return [...byRoute.entries()].map(([routeType, values]) => ({
    routeType,
    ...values,
  }));
}

export function buildExceptionAgingReport(exceptions: ReportException[], now: Date) {
  const open = exceptions.filter((exception) => exception.status === "open");

  return {
    open: open.length,
    blocker: open.filter((exception) => exception.severity === "blocker").length,
    maxAgeDays: open.reduce((max, exception) => {
      const ageDays = Math.floor((now.getTime() - exception.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      return Math.max(max, ageDays);
    }, 0),
  };
}

export function assertPiiSafeAggregateOutput(report: unknown) {
  const serialized = JSON.stringify(report);
  const piiLikePatterns = [
    /@/,
    /\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\bpm:[0-9a-f]{8}-[0-9a-f-]{27,}\b/i,
  ];

  return !piiLikePatterns.some((pattern) => pattern.test(serialized));
}
