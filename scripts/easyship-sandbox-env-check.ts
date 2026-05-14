import { createEasyshipReadiness, easyshipApiToken } from "../src/lib/easyship";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

function envValue(key: string) {
  return String(process.env[key] ?? "").trim();
}

const readiness = createEasyshipReadiness(process.env);
const token = easyshipApiToken(process.env);
const tokenLength = token.length;
const checks = [
  {
    name: "easyship-mode-sandbox",
    ok: readiness.mode === "sandbox",
    detail: readiness.mode === "sandbox" ? "EASYSHIP_MODE is sandbox." : `EASYSHIP_MODE is ${readiness.mode}.`,
  },
  ...readiness.checks,
  {
    name: "sandbox-rates-only",
    ok:
      envValue("EASYSHIP_ENABLE_RATES") === "true" &&
      envValue("EASYSHIP_ENABLE_SHIPMENTS") !== "true" &&
      envValue("EASYSHIP_ENABLE_TRACKING") !== "true" &&
      envValue("FULFILLMENT_ENABLE_PARTNER_API_PUSH") !== "true",
    detail: `rates=${envValue("EASYSHIP_ENABLE_RATES") || "false"}, shipment=${envValue("EASYSHIP_ENABLE_SHIPMENTS") || "false"}, tracking=${
      envValue("EASYSHIP_ENABLE_TRACKING") || "false"
    }, partnerPush=${envValue("FULFILLMENT_ENABLE_PARTNER_API_PUSH") || "false"}.`,
  },
];
const ok = readiness.ok && readiness.code === "easyship_sandbox_ready";

console.log(
  JSON.stringify(
    {
      ok,
      checked: "easyship-sandbox-env",
      provider: "easyship",
      mode: readiness.mode,
      readinessCode: readiness.code,
      apiBaseUrl: readiness.apiBaseUrl,
      token: {
        configured: tokenLength > 0,
        length: tokenLength,
        value: "redacted",
      },
      checks,
      externalActions: "none",
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
