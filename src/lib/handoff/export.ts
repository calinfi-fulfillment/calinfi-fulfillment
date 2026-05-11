import { LIVE_MUTATION_FLAG_KEYS, liveMutationFlags, type SafetyEnv } from "../safety";
import type { ExportCandidateOrder, HandoffExportRow, HandoffPreviewItem } from "./types";

const EXPORT_COLUMNS = ["sourceOrderKey", "routeType", "shippingMode", "status"] as const;

export function isOrderExportReady(order: ExportCandidateOrder) {
  const paid = order.paymentStatus === "completed" || order.paymentStatus === "covered_approved";

  return (
    order.orderStatus === "locked_for_fulfillment" &&
    order.decisionStatus === "paid_locked" &&
    paid
  );
}

export function createHandoffPreview(orders: ExportCandidateOrder[]): HandoffPreviewItem[] {
  return orders.map((order) => {
    const exportReady = isOrderExportReady(order);

    return {
      order,
      exportReady,
      reason: exportReady ? "export_ready" : "not_locked_or_paid",
    };
  });
}

export function exportHandoffRows(preview: HandoffPreviewItem[]): HandoffExportRow[] {
  return preview
    .filter((item) => item.exportReady)
    .map(({ order }) => ({
      sourceOrderKey: order.sourceOrderKey,
      routeType: order.routeType,
      shippingMode: order.shippingMode,
      status: "exported",
    }));
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportHandoffCsv(rows: HandoffExportRow[]) {
  const header = EXPORT_COLUMNS.join(",");
  const body = rows.map((row) => EXPORT_COLUMNS.map((column) => csvValue(row[column])).join(","));
  return [header, ...body].join("\n");
}

export function exportHandoffJson(rows: HandoffExportRow[]) {
  return JSON.stringify({ rows }, null, 2);
}

export function isPartnerApiPushEnabled(env: SafetyEnv = process.env) {
  return liveMutationFlags(env)[LIVE_MUTATION_FLAG_KEYS.find((key) => key === "FULFILLMENT_ENABLE_PARTNER_API_PUSH")!];
}
