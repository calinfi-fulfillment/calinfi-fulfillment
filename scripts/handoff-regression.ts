import assert from "node:assert/strict";

import {
  createHandoffPreview,
  exportHandoffCsv,
  exportHandoffJson,
  exportHandoffRows,
  isOrderExportReady,
  isPartnerApiPushEnabled,
  type ExportCandidateOrder,
} from "../src/lib/handoff";

const lockedOrder: ExportCandidateOrder = {
  orderId: "aaaaaaaa-1111-4111-8111-aaaaaaaa1111",
  sourceOrderKey: "pm:locked-order",
  orderStatus: "locked_for_fulfillment",
  decisionStatus: "paid_locked",
  paymentStatus: "completed",
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
};

const pendingOrder: ExportCandidateOrder = {
  orderId: "bbbbbbbb-2222-4222-8222-bbbbbbbb2222",
  sourceOrderKey: "pm:pending-order",
  orderStatus: "payment_pending",
  decisionStatus: "payment_pending",
  paymentStatus: "pending",
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
};

assert.equal(isOrderExportReady(lockedOrder), true);
assert.equal(isOrderExportReady(pendingOrder), false);

const preview = createHandoffPreview([lockedOrder, pendingOrder]);
const rows = exportHandoffRows(preview);
const csv = exportHandoffCsv(rows);
const json = exportHandoffJson(rows);

assert.equal(preview.filter((item) => item.exportReady).length, 1);
assert.match(csv, /sourceOrderKey,routeType,shippingMode,status/);
assert.match(csv, /"pm:locked-order"/);
assert.equal(JSON.parse(json).rows.length, 1);
assert.equal(isPartnerApiPushEnabled({ FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false" }), false);
assert.equal(isPartnerApiPushEnabled({ FULFILLMENT_ENABLE_PARTNER_API_PUSH: "true" }), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "handoff",
      exportedRows: rows.length,
      partnerApiPushDefault: isPartnerApiPushEnabled({}),
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
