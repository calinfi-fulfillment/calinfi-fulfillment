import assert from "node:assert/strict";

import { createVercelBypassReport } from "../src/lib/vercel-bypass";
import { DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF, type SafetyEnv } from "../src/lib/safety";

const safeEnv: SafetyEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://mgdsvapgltzwhsioccqd.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic_publishable",
  PM_SUPABASE_BLOCKED_PROJECT_REF: DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF,
  FULFILLMENT_ENABLE_PM_INTAKE: "false",
  FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "false",
  FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
  FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "false",
  FULFILLMENT_ENABLE_HANDOFF_EXPORTS: "false",
  FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
};

const report = createVercelBypassReport(safeEnv);
assert.equal(report.mode, "local_staging_without_vercel_git");
assert.equal(report.okForDevelopment, true);
assert.equal(report.okForLaunch, false);
assert.equal(report.checks.find((check) => check.name === "vercel-git-integration")?.status, "blocked_non_critical");

const pmReport = createVercelBypassReport({
  ...safeEnv,
  NEXT_PUBLIC_SUPABASE_URL: `https://${DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF}.supabase.co`,
});
assert.equal(pmReport.okForDevelopment, false);
assert.equal(pmReport.checks.find((check) => check.name === "pm-supabase-guard")?.status, "blocked_pending_approval");

const liveFlagReport = createVercelBypassReport({
  ...safeEnv,
  FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "true",
});
assert.equal(liveFlagReport.okForDevelopment, false);
assert.equal(liveFlagReport.checks.find((check) => check.name === "live-actions")?.status, "blocked_pending_approval");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "vercel-bypass-mode",
      mode: report.mode,
      okForDevelopment: report.okForDevelopment,
      okForLaunch: report.okForLaunch,
    },
    null,
    2,
  ),
);
