import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  cockpitQueues,
  exceptionRows,
  nextActionRows,
  orderRows,
  paymentRows,
  quoteRows,
  readinessRows,
  reportRows,
  routeReviewRows,
} from "../src/lib/ops-ui/fixtures";
import { OPS_NAV_ITEMS } from "../src/lib/ops-ui/navigation";

assert.deepEqual(
  OPS_NAV_ITEMS.map((item) => item.label),
  ["Kontrol Paneli", "Siparişler", "Kargo Ücreti", "Ödemeler", "Kargoya Hazır", "Sorunlar", "Raporlar"],
);

for (const route of ["orders", "quotes", "payments", "handoffs", "exceptions", "reports"]) {
  assert.equal(existsSync(`src/app/${route}/page.tsx`), true, `${route} page must exist`);
}

assert.equal(cockpitQueues.length >= 4, true);
assert.equal(orderRows.length > 0, true);
assert.equal(quoteRows.some((row) => row.route === "CHINA_HK_DIRECT_DDP"), true);
assert.equal(paymentRows.length > 0, true);
assert.equal(exceptionRows.some((row) => row.severity === "blocker"), true);
assert.equal(nextActionRows.some((row) => row.status === "blocker"), true);
assert.equal(readinessRows.some((row) => row.status === "blocker"), true);
assert.equal(readinessRows.filter((row) => row.status === "blocker").length, 1);
assert.equal(routeReviewRows.some((row) => row.route === "CHINA_HK_DIRECT_DDP"), true);
assert.equal(reportRows.some((row) => Number.parseInt(row.value, 10) > 0), true);

for (const component of [
  "src/components/data-table.tsx",
  "src/components/exception-triage.tsx",
  "src/components/handoff-workbench.tsx",
  "src/components/local-staging-mode-readiness.tsx",
  "src/components/manual-ddp-quote.tsx",
  "src/components/orders-workbench.tsx",
  "src/components/ops-command-center.tsx",
  "src/components/payment-event-workbench.tsx",
  "src/components/provider-api-readiness.tsx",
  "src/components/reports-dashboard.tsx",
  "src/components/staging-pilot-readiness.tsx",
  "src/components/stripe-checkout-readiness.tsx",
]) {
  assert.equal(existsSync(component), true, `${component} must exist`);
}

const dataTableSource = readFileSync("src/components/data-table.tsx", "utf8");
const cockpitSource = readFileSync("src/app/page.tsx", "utf8");
const handoffsSource = readFileSync("src/app/handoffs/page.tsx", "utf8");
const ordersSource = readFileSync("src/app/orders/page.tsx", "utf8");
const paymentsSource = readFileSync("src/app/payments/page.tsx", "utf8");
const quotesSource = readFileSync("src/app/quotes/page.tsx", "utf8");
const reportsSource = readFileSync("src/components/reports-dashboard.tsx", "utf8");
const stagingReadinessSource = readFileSync("src/components/staging-pilot-readiness.tsx", "utf8");
const localStagingSource = readFileSync("src/components/local-staging-mode-readiness.tsx", "utf8");
const providerReadinessSource = readFileSync("src/components/provider-api-readiness.tsx", "utf8");
const stripeCheckoutReadinessSource = readFileSync("src/components/stripe-checkout-readiness.tsx", "utf8");
const appShellSource = readFileSync("src/components/app-shell.tsx", "utf8");
const labelsSource = readFileSync("src/lib/ops-ui/labels.ts", "utf8");

assert.match(dataTableSource, /data-testid="interactive-data-table"/);
assert.match(dataTableSource, /type="search"/);
assert.match(dataTableSource, /type="radio"/);
assert.match(dataTableSource, /Sipariş, ürün veya durum ara/);
assert.match(appShellSource, /page-guide/);
assert.match(appShellSource, /ODUN Kargo Paneli/);
assert.match(labelsSource, /Sipariş/);
assert.match(labelsSource, /Blokaj/);
assert.match(cockpitSource, /OpsCommandCenter/);
assert.match(cockpitSource, /Bugün ne yapacağız/);
assert.match(handoffsSource, /HandoffWorkbench/);
assert.match(handoffsSource, /ProviderApiReadiness/);
assert.match(ordersSource, /OrdersWorkbench/);
assert.match(paymentsSource, /PaymentEventWorkbench/);
assert.match(paymentsSource, /StripeCheckoutReadinessPanel/);
assert.match(paymentsSource, /Ödeme kontrolü/);
assert.match(quotesSource, /ManualDdpQuote/);
assert.match(quotesSource, /ProviderApiReadiness/);
assert.match(quotesSource, /Kargo ücreti çıkar/);
assert.match(handoffsSource, /Kargoya teslim hazırlığı/);
assert.match(reportsSource, /data-testid="reports-dashboard"/);
assert.match(cockpitSource, /StagingPilotReadiness/);
assert.match(cockpitSource, /LocalStagingModeReadiness/);
assert.match(stagingReadinessSource, /data-testid="staging-pilot-readiness"/);
assert.match(stagingReadinessSource, /Test Supabase bağla/);
assert.match(stagingReadinessSource, /Firmaya canlı gönder/);
assert.match(localStagingSource, /data-testid="vercel-bypass-readiness"/);
assert.match(localStagingSource, /Yerel test modu/);
assert.match(providerReadinessSource, /Maket fiyat/);
assert.match(providerReadinessSource, /Maket teslim/);
assert.match(providerReadinessSource, /Maket takip/);
assert.match(providerReadinessSource, /Easyship fiyat planı/);
assert.match(providerReadinessSource, /Easyship teslim kilidi/);
assert.match(providerReadinessSource, /Easyship durumu/);
assert.match(stripeCheckoutReadinessSource, /data-testid="stripe-checkout-readiness"/);
assert.match(stripeCheckoutReadinessSource, /Test ödemesi aç/);
assert.match(stripeCheckoutReadinessSource, /Canlı ödeme/);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "ops-ui",
      navItems: OPS_NAV_ITEMS.map((item) => item.label),
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
