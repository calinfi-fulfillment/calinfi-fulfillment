import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checklist = readFileSync("docs/PROJECT_CHECKLIST.md", "utf8");

assert.match(checklist, /^Last updated: 2026-05-15$/m);
assert.match(checklist, /docs\/audits\/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT\.md/);
assert.match(checklist, /Vercel Git integration confirmed\. Verified by `docs\/evidence\/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15\.json`/);
assert.match(checklist, /PM production read-only aggregate baseline alındı\. Verified by `docs\/evidence\/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15\.json`/);
assert.match(checklist, /SFC API certificate rotate\/review confirmed\. Verified by owner-approved `docs\/evidence\/SFC_CERTIFICATE_REVIEW_2026-05-15\.json`/);
assert.match(checklist, /Sınır Bekçisi pre-pilot audit geçti\. Verified by owner-approved SFC certificate review evidence/);
assert.match(checklist, /1-2 allowlisted staging pilot order run completed\. Verified by `docs\/evidence\/STAGING_PILOT_ORDER_RUN_2026-05-15\.json`/);
assert.match(checklist, /`test:staging-pilot-run`/);
assert.match(checklist, /- \[x\] Stripe test-mode pilot öncesinde\./);
assert.doesNotMatch(
  checklist,
  /real Stripe test env not connected|Stripe real test account\/env verification is still pending|Easyship 401|fresh staging Supabase and PM read-only baseline required|preview redeploy/i,
);

const allowedOpenItems = [
  /Production environment configured/,
  /Production flags reviewed/,
  /Backup\/snapshot completed/,
  /Rollback\/flag-off drill confirmed/,
  /Final Sınır Bekçisi boundary audit geçti/,
  /Owner go\/no-go/,
  /Production smoke passed/,
  /All `Final Completion Plan` items/,
  /Production env checklist tamam/,
  /Production launch readiness true/,
  /SFC warehouse ve DDP method-code detayları doğrulandı/,
  /Production go\/no-go öncesinde/,
];

const openItems = checklist
  .split("\n")
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => line.includes("- [ ]"));

for (const item of openItems) {
  assert.match(item.line, /BLOCKED:/, `Open checklist item must carry a BLOCKED reason at line ${item.lineNumber}: ${item.line}`);
  assert.ok(
    allowedOpenItems.some((pattern) => pattern.test(item.line)),
    `Unexpected open checklist item at line ${item.lineNumber}: ${item.line}`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "checklist-regression",
      openItems: openItems.length,
      mode: "static-checklist-only",
    },
    null,
    2,
  ),
);
