import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF, type SafetyEnv } from "../src/lib/safety";
import { createStagingPrepReport, createSyntheticPilotImportPlan } from "../src/lib/staging-prep";

function assertBlocked(env: SafetyEnv, checkName: string) {
  const report = createStagingPrepReport(env);
  assert.equal(report.ok, false);
  assert.equal(report.mode, "blocked");
  assert.equal(report.checks.find((check) => check.name === checkName)?.ok, false);
}

const emptyReport = createStagingPrepReport({});
assert.equal(emptyReport.ok, true);
assert.equal(emptyReport.mode, "local_preview");

const stagingReport = createStagingPrepReport({
  NEXT_PUBLIC_SUPABASE_URL: "https://odunfulfillmentv1safe.supabase.co",
  STRIPE_MODE: "test",
});
assert.equal(stagingReport.ok, true);
assert.equal(stagingReport.mode, "staging_ready");

assertBlocked(
  {
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF}.supabase.co`,
  },
  "supabase-target",
);
assertBlocked({ STRIPE_MODE: "live" }, "stripe-mode");
assertBlocked({ FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "true" }, "live-mutation-flags");
assertBlocked({ FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "true" }, "live-mutation-flags");
assertBlocked({ FULFILLMENT_ENABLE_HANDOFF_EXPORTS: "true" }, "live-mutation-flags");
assertBlocked({ FULFILLMENT_ENABLE_PARTNER_API_PUSH: "true" }, "live-mutation-flags");
assertBlocked({ FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "true" }, "live-mutation-flags");

const importPlan = createSyntheticPilotImportPlan(readFileSync("fixtures/synthetic-pilot-orders.json", "utf8"));
assert.equal(importPlan.ok, true);
assert.equal(importPlan.fixtureSafe, true);
assert.equal(importPlan.orders, 2);
assert.equal(importPlan.exportedPreviewRows, 2);
assert.equal(importPlan.excludedBuiltinItems, 1);
assert.deepEqual(importPlan.routeTypes.sort(), ["CHINA_HK_DIRECT_DDP", "REGIONAL_3PL"]);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "staging-prep",
      scenarios: ["empty-env", "pm-supabase-block", "safe-staging-url", "live-flags", "stripe-live", "synthetic-import-plan"],
      mode: "dry-run-only",
    },
    null,
    2,
  ),
);
