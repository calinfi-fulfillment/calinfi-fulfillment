import type { DecisionStatus, FulfillmentRouteType, HandoffStatus, OrderStatus, ShippingMode } from "../domain";

export type ExportCandidateOrder = {
  orderId: string;
  sourceOrderKey: string;
  orderStatus: OrderStatus;
  decisionStatus: DecisionStatus;
  paymentStatus: "completed" | "covered_approved" | "pending" | "review_required";
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
};

export type HandoffPreviewItem = {
  order: ExportCandidateOrder;
  exportReady: boolean;
  reason: string;
};

export type HandoffExportRow = {
  sourceOrderKey: string;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  status: HandoffStatus;
};
