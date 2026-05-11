import { readFileSync } from "node:fs";

import { createStagingPrepReport, createSyntheticPilotImportPlan } from "../src/lib/staging-prep";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

const envReport = createStagingPrepReport();
const importPlan = createSyntheticPilotImportPlan(readFileSync("fixtures/synthetic-pilot-orders.json", "utf8"));
const ok = envReport.ok && importPlan.ok;

console.log(
  JSON.stringify(
    {
      ok,
      checked: "staging-prep",
      mode: envReport.mode,
      envChecks: envReport.checks,
      syntheticImportPlan: importPlan,
      externalActions: "none",
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
