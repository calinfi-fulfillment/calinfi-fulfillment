import { createSfcReadOnlySmokePlan } from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

const plan = createSfcReadOnlySmokePlan({
  warehouseId: Number(process.env.SFC_SMOKE_WAREHOUSE_ID || 1),
  stockSku: process.env.SFC_SMOKE_STOCK_SKU || "CLF-ODN-CORE",
  country: process.env.SFC_SMOKE_COUNTRY || "HK",
  shippingMethodCode: process.env.SFC_SMOKE_SHIPPING_METHOD_CODE || undefined,
});

console.log(
  JSON.stringify(
    {
      ok: plan.ok,
      checked: "sfc-read-only-smoke-plan",
      provider: plan.provider,
      code: plan.code,
      readinessCode: plan.readinessCode,
      requestActions: plan.requests.map((request) => request.action),
      externalActions: plan.externalActions,
      checks: plan.checks,
    },
    null,
    2,
  ),
);

if (!plan.ok) {
  process.exitCode = 1;
}
