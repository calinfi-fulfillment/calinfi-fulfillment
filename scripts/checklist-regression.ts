import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checklist = readFileSync("docs/PROJECT_CHECKLIST.md", "utf8");

assert.match(checklist, /^Last updated: 2026-05-15$/m);
assert.match(checklist, /docs\/audits\/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT\.md/);
assert.match(checklist, /- \[x\] Stripe test-mode pilot öncesinde\./);
assert.doesNotMatch(checklist, /real Stripe test env not connected|Stripe real test account\/env verification is still pending|Easyship 401|fresh staging Supabase and PM read-only baseline required/i);

const allowedOpenItems = [
  /Vercel Git integration confirmed/,
  /Protected Vercel preview final smoke passed/,
  /PM production read-only aggregate baseline/,
  /Sınır Bekçisi pre-pilot audit geçti/,
  /1-2 allowlisted staging pilot order run completed/,
  /Production environment configured/,
  /Production flags reviewed/,
  /Backup\/snapshot completed/,
  /Rollback\/flag-off drill confirmed/,
  /Final Sınır Bekçisi boundary audit geçti/,
  /Owner go\/no-go/,
  /Production smoke passed/,
  /All `Final Completion Plan` items/,
  /PM baseline\/audit still blocked/,
  /Production env checklist tamam/,
  /Production launch readiness true/,
  /SFC API certificate rotate\/review confirmed/,
  /SFC warehouse ve DDP method-code detayları doğrulandı/,
  /Staging pilot öncesinde/,
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
