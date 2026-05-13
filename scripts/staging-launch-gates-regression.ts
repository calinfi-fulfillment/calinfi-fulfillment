import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { areLiveMutationFlagsDisabled, isPledgeManagerSupabaseUrl } from "../src/lib/safety";

const requiredDocs = [
  "docs/runbooks/STAGING_PILOT.md",
  "docs/runbooks/STAGING_SUPABASE_SETUP.md",
  "docs/runbooks/LOCAL_STAGING_WITHOUT_VERCEL.md",
  "docs/runbooks/ROLLBACK_FLAGS.md",
  "docs/runbooks/BACKUP_SNAPSHOT.md",
  "docs/runbooks/LAUNCH_READINESS.md",
  "docs/runbooks/SFC_READ_ONLY_SMOKE.md",
];

for (const docPath of requiredDocs) {
  const content = readFileSync(docPath, "utf8");
  assert.match(content, /owner|Owner|Sınır|PM|Fulfillment/, `${docPath} must describe governance`);
  assert.doesNotMatch(content, /service_role=|SUPABASE_SERVICE_ROLE_KEY=.+\w|sk_live_|whsec_|eyJ/, `${docPath} must not contain secrets`);
}

const fixture = readFileSync("fixtures/synthetic-pilot-orders.json", "utf8");
assert.doesNotMatch(fixture, /@|\+\d{6,}|address|phone|token|auth/i);

const envExample = readFileSync(".env.example", "utf8");
assert.match(envExample, /STRIPE_MODE=test/);
assert.match(envExample, /PM_SUPABASE_BLOCKED_PROJECT_REF=cjygwbfjekhhvwlyujyj/);
assert.match(envExample, /FULFILLMENT_ENABLE_PARTNER_API_PUSH=false/);
assert.match(envExample, /SFC_ENABLE_READ_ONLY_API=false/);
assert.match(envExample, /SFC_ENABLE_MUTATIONS=false/);
assert.equal(areLiveMutationFlagsDisabled({}), true);
assert.equal(isPledgeManagerSupabaseUrl("https://cjygwbfjekhhvwlyujyj.supabase.co"), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "staging-launch-gates",
      docs: requiredDocs,
      fixture: "fixtures/synthetic-pilot-orders.json",
      mode: "dry-run-only",
    },
    null,
    2,
  ),
);
