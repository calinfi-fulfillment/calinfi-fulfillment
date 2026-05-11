import { createPreflightReport } from "../src/lib/preflight";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

const report = createPreflightReport();

console.log(
  JSON.stringify(
    {
      ok: report.ok,
      checked: "preflight",
      checks: report.checks,
    },
    null,
    2,
  ),
);

if (!report.ok) {
  process.exitCode = 1;
}
