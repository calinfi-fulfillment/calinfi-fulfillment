import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { OPS_NAV_ITEMS } from "../src/lib/ops-ui/navigation";

assert.deepEqual(
  OPS_NAV_ITEMS.map((item) => item.label),
  ["Bugün", "Siparişler", "Stok", "Kargo", "Fiyat", "Ödeme", "Teslim", "Sorunlar", "Raporlar"],
);

for (const route of ["shipping", "inventory", "orders", "quotes", "payments", "handoffs", "exceptions", "reports"]) {
  assert.equal(existsSync(`src/app/${route}/page.tsx`), true, `${route} page must exist`);
}

for (const component of [
  "src/components/app-shell.tsx",
  "src/components/data-table.tsx",
  "src/components/detail-popup.tsx",
  "src/components/exception-triage.tsx",
  "src/components/guided-quote-workflow.tsx",
  "src/components/handoff-workbench.tsx",
  "src/components/inventory-workbench.tsx",
  "src/components/manual-ddp-quote.tsx",
  "src/components/ops-command-center.tsx",
  "src/components/ops-modal.tsx",
  "src/components/orders-workbench.tsx",
  "src/components/payment-event-workbench.tsx",
  "src/components/reports-dashboard.tsx",
  "src/components/shipping-console.tsx",
  "src/components/status-badge.tsx",
  "src/components/stripe-checkout-readiness.tsx",
]) {
  assert.equal(existsSync(component), true, `${component} must exist`);
}

const liveDataSource = readFileSync("src/lib/ops-ui/live-data.ts", "utf8");
const appShellSource = readFileSync("src/components/app-shell.tsx", "utf8");
const dataTableSource = readFileSync("src/components/data-table.tsx", "utf8");
const cockpitSource = readFileSync("src/app/page.tsx", "utf8");
const ordersPageSource = readFileSync("src/app/orders/page.tsx", "utf8");
const shippingPageSource = readFileSync("src/app/shipping/page.tsx", "utf8");
const quotesPageSource = readFileSync("src/app/quotes/page.tsx", "utf8");
const paymentsPageSource = readFileSync("src/app/payments/page.tsx", "utf8");
const handoffsPageSource = readFileSync("src/app/handoffs/page.tsx", "utf8");
const inventoryPageSource = readFileSync("src/app/inventory/page.tsx", "utf8");
const exceptionsPageSource = readFileSync("src/app/exceptions/page.tsx", "utf8");
const reportsPageSource = readFileSync("src/app/reports/page.tsx", "utf8");
const guidedQuoteSource = readFileSync("src/components/guided-quote-workflow.tsx", "utf8");
const inventorySource = readFileSync("src/components/inventory-workbench.tsx", "utf8");
const manualDdpSource = readFileSync("src/components/manual-ddp-quote.tsx", "utf8");
const ordersSource = readFileSync("src/components/orders-workbench.tsx", "utf8");
const shippingConsoleSource = readFileSync("src/components/shipping-console.tsx", "utf8");
const reportsSource = readFileSync("src/components/reports-dashboard.tsx", "utf8");
const labelsSource = readFileSync("src/lib/ops-ui/labels.ts", "utf8");

assert.match(liveDataSource, /getOpsUiData/);
assert.match(liveDataSource, /order_snapshot/);
assert.match(liveDataSource, /source === "pledge_manager"/);
assert.match(liveDataSource, /hasFulfillmentSupabaseServiceRoleConfig/);
assert.match(liveDataSource, /Provider fiyat API flag/);
assert.match(liveDataSource, /Stripe checkout flag/);
assert.match(liveDataSource, /Partner push/);

for (const source of [
  cockpitSource,
  ordersPageSource,
  shippingPageSource,
  quotesPageSource,
  paymentsPageSource,
  handoffsPageSource,
  inventoryPageSource,
  exceptionsPageSource,
  reportsPageSource,
]) {
  assert.match(source, /getOpsUiData/);
  assert.match(source, /force-dynamic/);
  assert.doesNotMatch(source, /ops-ui\/fixtures/);
}

assert.match(appShellSource, /PageGuidePopup/);
assert.match(appShellSource, /ODUN Kargo Paneli/);
assert.match(dataTableSource, /data-testid="interactive-data-table"/);
assert.match(dataTableSource, /OpsModal/);
assert.match(dataTableSource, /Sipariş, ürün veya durum ara/);
assert.match(guidedQuoteSource, /data-testid="guided-quote-workflow"/);
assert.match(guidedQuoteSource, /Fiyatı hazırla/);
assert.doesNotMatch(guidedQuoteSource, /Sandbox fiyatı seç/);
assert.match(inventorySource, /demandRows/);
assert.match(inventorySource, /supplyRows/);
assert.match(manualDdpSource, /orders = \[\]/);
assert.match(ordersSource, /Henüz aktarılmış sipariş yok/);
assert.match(shippingConsoleSource, /shipmentRows/);
assert.match(shippingConsoleSource, /Provider gönderimi kapalı/);
assert.match(shippingPageSource, /orderLineRows/);
assert.doesNotMatch(shippingPageSource, /createSyntheticPackagePlanPreview/);
assert.doesNotMatch(shippingPageSource, /PackagePlanPreview/);
assert.doesNotMatch(quotesPageSource, /NetworkReadiness/);
assert.doesNotMatch(quotesPageSource, /ProviderApiReadiness/);
assert.match(paymentsPageSource, /Gelişmiş Stripe kontrolleri/);
assert.match(handoffsPageSource, /shippingGuardRows/);
assert.match(reportsSource, /data-testid="reports-dashboard"/);
assert.match(labelsSource, /Sipariş/);
assert.match(labelsSource, /Blokaj/);

console.log(
  JSON.stringify(
    {
      checked: "ops-ui",
      mode: "pm-intake-live-data",
      navItems: OPS_NAV_ITEMS.map((item) => item.label),
      ok: true,
    },
    null,
    2,
  ),
);
