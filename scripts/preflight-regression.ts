import assert from "node:assert/strict";

import { createPreflightReport } from "../src/lib/preflight";
import { DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF, type SafetyEnv } from "../src/lib/safety";

const safeEnv: SafetyEnv = {
  STRIPE_MODE: "test",
  FULFILLMENT_ENABLE_PM_INTAKE: "false",
  FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "false",
  FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
  FULFILLMENT_ENABLE_STRIPE_CHECKOUT: "false",
  FULFILLMENT_ENABLE_HANDOFF_EXPORTS: "false",
  FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
};

assert.equal(createPreflightReport(safeEnv).ok, true);

const pmSupabaseReport = createPreflightReport({
  ...safeEnv,
  NEXT_PUBLIC_SUPABASE_URL: `https://${DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF}.supabase.co`,
});
assert.equal(pmSupabaseReport.ok, false);
assert.equal(pmSupabaseReport.checks.find((check) => check.name === "pm-supabase-blocklist")?.ok, false);

const liveFlagReport = createPreflightReport({
  ...safeEnv,
  FULFILLMENT_ENABLE_HANDOFF_EXPORTS: "true",
});
assert.equal(liveFlagReport.ok, false);
assert.equal(liveFlagReport.checks.find((check) => check.name === "live-mutation-flags")?.ok, false);

const stripeLiveReport = createPreflightReport({
  ...safeEnv,
  STRIPE_MODE: "live",
});
assert.equal(stripeLiveReport.ok, false);
assert.equal(stripeLiveReport.checks.find((check) => check.name === "stripe-test-mode")?.ok, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "preflight-regression",
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
