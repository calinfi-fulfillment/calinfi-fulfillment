import assert from "node:assert/strict";

import {
  DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF,
  assertNotPledgeManagerSupabaseUrl,
  fulfillmentSupabasePublishableKey,
  hasFulfillmentSupabasePublicConfig,
  hasFulfillmentSupabaseServiceRoleConfig,
  isPledgeManagerSupabaseUrl,
  supabaseProjectRefFromUrl,
  type SafetyEnv,
} from "../src/lib/safety";

const pmUrl = `https://${DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF}.supabase.co`;
const fulfillmentUrl = "https://odunfulfillmentv1safe.supabase.co";

const envWithPmSupabase: SafetyEnv = {
  NEXT_PUBLIC_SUPABASE_URL: pmUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  PM_SUPABASE_BLOCKED_PROJECT_REF: DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF,
};

assert.equal(supabaseProjectRefFromUrl(pmUrl), DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF);
assert.equal(isPledgeManagerSupabaseUrl(pmUrl, envWithPmSupabase), true);
assert.equal(hasFulfillmentSupabasePublicConfig(envWithPmSupabase), false);
assert.equal(hasFulfillmentSupabaseServiceRoleConfig(envWithPmSupabase), false);
assert.throws(
  () => assertNotPledgeManagerSupabaseUrl(pmUrl, envWithPmSupabase),
  /cannot connect to the live Pledge Manager Supabase project/,
);

const envWithFulfillmentSupabase: SafetyEnv = {
  ...envWithPmSupabase,
  NEXT_PUBLIC_SUPABASE_URL: fulfillmentUrl,
};
const envWithPublishableKey: SafetyEnv = {
  NEXT_PUBLIC_SUPABASE_URL: fulfillmentUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
};

assert.equal(supabaseProjectRefFromUrl(fulfillmentUrl), "odunfulfillmentv1safe");
assert.equal(isPledgeManagerSupabaseUrl(fulfillmentUrl, envWithFulfillmentSupabase), false);
assert.equal(hasFulfillmentSupabasePublicConfig(envWithFulfillmentSupabase), true);
assert.equal(hasFulfillmentSupabaseServiceRoleConfig(envWithFulfillmentSupabase), true);
assert.doesNotThrow(() => assertNotPledgeManagerSupabaseUrl(fulfillmentUrl, envWithFulfillmentSupabase));
assert.equal(hasFulfillmentSupabasePublicConfig(envWithPublishableKey), true);
assert.equal(fulfillmentSupabasePublishableKey(envWithPublishableKey), "synthetic-publishable-key");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "pm-supabase-guard",
      blockedProjectRef: DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
