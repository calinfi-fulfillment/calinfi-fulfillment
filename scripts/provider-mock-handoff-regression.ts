import assert from "node:assert/strict";

import { createHandoffPreview, exportHandoffRows, type ExportCandidateOrder } from "../src/lib/handoff";
import { mockFulfillmentProviderAdapter } from "../src/lib/provider-adapter";

const lockedOrder: ExportCandidateOrder = {
  orderId: "23232323-2323-4232-8232-232323232323",
  sourceOrderKey: "pm:provider-mock-handoff",
  orderStatus: "locked_for_fulfillment",
  decisionStatus: "paid_locked",
  paymentStatus: "completed",
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
};

const preview = createHandoffPreview([lockedOrder]);
const rows = exportHandoffRows(preview);

assert.equal(rows.length, 1);
assert.equal(preview[0]?.exportReady, true);

const handoff = mockFulfillmentProviderAdapter.createHandoff!({
  orderId: lockedOrder.orderId,
  sourceOrderKey: lockedOrder.sourceOrderKey,
  routeType: lockedOrder.routeType,
  shippingMode: lockedOrder.shippingMode,
  idempotencyKey: `${lockedOrder.sourceOrderKey}:mock-handoff:v1`,
});

assert.equal(handoff.ok, true);
assert.equal(handoff.status, "mock_created");
assert.equal(handoff.externalActions, "none");

const tracking = mockFulfillmentProviderAdapter.getTracking!({
  providerHandoffId: handoff.providerHandoffId,
});

assert.equal(tracking.status, "label_pending");
assert.equal(tracking.externalActions, "none");
assert.match(tracking.trackingNumber ?? "", /^MOCK-/);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "provider-mock-handoff",
      exportedRows: rows.length,
      handoffStatus: handoff.status,
      trackingStatus: tracking.status,
      mode: "mock-only",
    },
    null,
    2,
  ),
);
