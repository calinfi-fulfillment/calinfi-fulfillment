export const cockpitQueues = [
  { label: "Ready for quote", count: 18, detail: "Fresh intake with Product Master ready", tone: "good" },
  { label: "Blocked before Phase 2", count: 7, detail: "Hold, missing SKU, or address review", tone: "danger" },
  { label: "Payment pending", count: 12, detail: "Fresh quote selected, waiting for PM event", tone: "warning" },
  { label: "Handoff ready", count: 4, detail: "Paid locked and safe to export", tone: "neutral" },
] as const;

export const nextActionRows = [
  {
    priority: "1",
    queue: "Product Master",
    item: "Review missing customs fields",
    owner: "Core Data",
    status: "blocker",
  },
  {
    priority: "2",
    queue: "DDP / Partner",
    item: "Approve manual DDP quote for HK test route",
    owner: "Ops",
    status: "review",
  },
  {
    priority: "3",
    queue: "Payments",
    item: "Process signed synthetic covered-payment event",
    owner: "Payment",
    status: "ready",
  },
] as const;

export const readinessRows = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    status: "ready",
    packaging: "ready",
    customs: "ready",
  },
  {
    sku: "CLF-ACC-STAND",
    title: "Display Stand",
    status: "review",
    packaging: "missing dimensions",
    customs: "not needed",
  },
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Add-on",
    status: "blocker",
    packaging: "ready",
    customs: "missing HS/origin/value",
  },
] as const;

export const routeReviewRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    country: "US",
    route: "REGIONAL_3PL",
    payment: "pending",
    action: "quote ready",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    country: "HK",
    route: "CHINA_HK_DIRECT_DDP",
    payment: "covered approval",
    action: "manual DDP review",
  },
] as const;

export const orderRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    status: "selection_submitted",
    address: "complete",
    products: "ready",
    route: "REGIONAL_3PL",
  },
  {
    sourceOrderKey: "pm:synthetic-order-002",
    status: "manual_hold",
    address: "needs_review",
    products: "blocked",
    route: "MANUAL_SPECIAL",
  },
] as const;

export const quoteRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    route: "REGIONAL_3PL",
    mode: "3PL_INTERNAL_LABEL",
    quote: "none",
    expires: "-",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    route: "CHINA_HK_DIRECT_DDP",
    mode: "DIRECT_DDP_PROVIDER",
    quote: "manual needed",
    expires: "-",
  },
] as const;

export const paymentRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    quote: "fresh",
    status: "payment_pending",
    guard: "awaiting signed event",
  },
] as const;

export const handoffRows = [
  {
    sourceOrderKey: "pm:synthetic-locked-001",
    route: "REGIONAL_3PL",
    status: "ready",
    exportType: "csv",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-locked-001",
    route: "CHINA_HK_DIRECT_DDP",
    status: "ready",
    exportType: "json",
  },
] as const;

export const exceptionRows = [
  {
    code: "missing_product_master_sku",
    severity: "blocker",
    owner: "Core Data",
    age: "0d",
  },
  {
    code: "payment_amount_mismatch",
    severity: "review",
    owner: "Payment",
    age: "1d",
  },
] as const;

export const reportRows = [
  { metric: "Ready orders", value: "18" },
  { metric: "Blocked orders", value: "7" },
  { metric: "Payment pending", value: "12" },
  { metric: "Handoff ready", value: "4" },
] as const;
