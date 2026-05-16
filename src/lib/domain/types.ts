import { z } from "zod";

export const ORDER_STATUSES = [
  "selection_submitted",
  "manual_hold",
  "fulfillment_ready",
  "payment_pending",
  "locked_for_fulfillment",
  "cancelled",
] as const;

export const ADDRESS_STATUSES = ["missing", "complete", "needs_review"] as const;

export const DECISION_SOURCES = ["system_default", "customer_selected", "admin_override"] as const;

export const FULFILLMENT_ROUTE_TYPES = [
  "REGIONAL_3PL",
  "CHINA_HK_DIRECT_DDP",
  "PARTNER_MANAGED",
  "MANUAL_SPECIAL",
] as const;

export const SHIPPING_MODES = [
  "3PL_INTERNAL_LABEL",
  "DIRECT_DDP_PROVIDER",
  "PARTNER_MANAGED",
  "MANUAL_LABEL",
] as const;

export const DECISION_STATUSES = [
  "needs_selection",
  "selected",
  "quote_ready",
  "payment_pending",
  "paid_locked",
  "voided",
] as const;

export const PRODUCT_READINESS_STATUSES = ["ready", "needs_review", "blocked"] as const;

export const QUOTE_STATUSES = ["ready", "expired", "voided", "failed", "accepted"] as const;

export const PAYMENT_EVENT_STATUSES = ["accepted", "duplicate", "mismatch", "ignored"] as const;

export const HANDOFF_STATUSES = [
  "ready",
  "exported",
  "accepted",
  "in_fulfillment",
  "shipped",
  "delivered",
  "exception",
] as const;

export const ISSUE_SEVERITIES = ["info", "warning", "blocker"] as const;

export const ISSUE_STATUSES = ["open", "resolved", "voided"] as const;

export const LINE_ROLES = ["reward", "addon", "prepaid", "builtin"] as const;

export const PACKAGE_PRODUCT_TYPES = ["main_box", "accessory", "replacement", "packaging"] as const;

export const INVENTORY_LOCATION_TYPES = ["factory", "sfc_warehouse", "regional_3pl", "internal", "partner"] as const;

export const INVENTORY_BATCH_STATUSES = [
  "planned",
  "in_production",
  "produced",
  "in_transit",
  "received",
  "quarantined",
  "closed",
] as const;

export const INVENTORY_RESERVATION_STATUSES = ["planned", "reserved", "released", "consumed", "voided"] as const;

export const BUILT_IN_SKUS = [
  "CLF-ACC-UNI-HND",
  "CLF-ACC-UNI-TNG",
  "CLF-ACC-UNI-TAG",
  "CLF-ACC-ODN-WBL",
  "CLF-ACC-ODS-WBL",
  "CLF-BAG-ODS-CRY",
] as const;

export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export const AddressStatusSchema = z.enum(ADDRESS_STATUSES);
export const DecisionSourceSchema = z.enum(DECISION_SOURCES);
export const FulfillmentRouteTypeSchema = z.enum(FULFILLMENT_ROUTE_TYPES);
export const ShippingModeSchema = z.enum(SHIPPING_MODES);
export const DecisionStatusSchema = z.enum(DECISION_STATUSES);
export const ProductReadinessStatusSchema = z.enum(PRODUCT_READINESS_STATUSES);
export const QuoteStatusSchema = z.enum(QUOTE_STATUSES);
export const PaymentEventStatusSchema = z.enum(PAYMENT_EVENT_STATUSES);
export const HandoffStatusSchema = z.enum(HANDOFF_STATUSES);
export const IssueSeveritySchema = z.enum(ISSUE_SEVERITIES);
export const IssueStatusSchema = z.enum(ISSUE_STATUSES);
export const LineRoleSchema = z.enum(LINE_ROLES);
export const PackageProductTypeSchema = z.enum(PACKAGE_PRODUCT_TYPES);
export const InventoryLocationTypeSchema = z.enum(INVENTORY_LOCATION_TYPES);
export const InventoryBatchStatusSchema = z.enum(INVENTORY_BATCH_STATUSES);
export const InventoryReservationStatusSchema = z.enum(INVENTORY_RESERVATION_STATUSES);
export const BuiltInSkuSchema = z.enum(BUILT_IN_SKUS);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type AddressStatus = z.infer<typeof AddressStatusSchema>;
export type DecisionSource = z.infer<typeof DecisionSourceSchema>;
export type FulfillmentRouteType = z.infer<typeof FulfillmentRouteTypeSchema>;
export type ShippingMode = z.infer<typeof ShippingModeSchema>;
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;
export type ProductReadinessStatus = z.infer<typeof ProductReadinessStatusSchema>;
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;
export type PaymentEventStatus = z.infer<typeof PaymentEventStatusSchema>;
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type LineRole = z.infer<typeof LineRoleSchema>;
export type PackageProductType = z.infer<typeof PackageProductTypeSchema>;
export type InventoryLocationType = z.infer<typeof InventoryLocationTypeSchema>;
export type InventoryBatchStatus = z.infer<typeof InventoryBatchStatusSchema>;
export type InventoryReservationStatus = z.infer<typeof InventoryReservationStatusSchema>;
export type BuiltInSku = z.infer<typeof BuiltInSkuSchema>;

export const ProductSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  readinessStatus: ProductReadinessStatusSchema,
  isBuiltinMainBoxItem: z.boolean().default(false),
  weightGrams: z.number().int().positive().nullable().optional(),
  lengthMm: z.number().int().positive().nullable().optional(),
  widthMm: z.number().int().positive().nullable().optional(),
  heightMm: z.number().int().positive().nullable().optional(),
  hsCode: z.string().nullable().optional(),
  countryOfOrigin: z.string().length(2).nullable().optional(),
  customsDescription: z.string().nullable().optional(),
  declaredValueCents: z.number().int().nonnegative().nullable().optional(),
  declaredValueCurrency: z.string().length(3).nullable().optional(),
  productType: PackageProductTypeSchema.default("accessory").optional(),
  canBundleWithMainBox: z.boolean().nullable().optional(),
  canBundleWithAccessories: z.boolean().nullable().optional(),
  requiresSeparateBox: z.boolean().nullable().optional(),
  bundleGroup: z.string().nullable().optional(),
  capacityUnits: z.number().int().nonnegative().nullable().optional(),
  shipGroup: z.string().nullable().optional(),
  preferredBoxSku: z.string().nullable().optional(),
  manualReviewRequired: z.boolean().nullable().optional(),
});

export const OrderLineSchema = z.object({
  sourceLineKey: z.string().min(1),
  sku: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  lineRole: LineRoleSchema,
  isBuiltinMainBoxItem: z.boolean().default(false),
});

export const ShippingQuoteSchema = z.object({
  orderId: z.string().uuid(),
  routeType: FulfillmentRouteTypeSchema,
  shippingMode: ShippingModeSchema,
  status: QuoteStatusSchema,
  currency: z.string().length(3),
  amountCents: z.number().int().nonnegative(),
  bufferCents: z.number().int().nonnegative(),
  expiresAt: z.string().datetime(),
});
