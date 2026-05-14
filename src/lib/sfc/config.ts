import type { SafetyEnv } from "../safety";

export type SfcMode = "mock" | "read_only" | "production";
export type SfcReadinessCode = "sfc_mock_only" | "sfc_read_only_ready" | "sfc_credentials_missing" | "sfc_mutation_blocked";

export type SfcReadiness = {
  ok: boolean;
  provider: "sendfromchina";
  mode: SfcMode;
  code: SfcReadinessCode;
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
};

const DEFAULT_SFC_WSDL_URL = "http://fulfill.sfcservice.com/default/svc/wsdl";
const DEFAULT_SFC_SERVICE_URL = "http://cff-api.suntekcorps.com/default/svc/web-service";

function enabled(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim() === "true";
}

export function sfcMode(env: SafetyEnv = process.env): SfcMode {
  const mode = String(env.SFC_MODE ?? "mock").trim().toLowerCase();

  if (mode === "read_only") return "read_only";
  if (mode === "production") return "production";
  return "mock";
}

export function sfcWsdlUrl(env: SafetyEnv = process.env) {
  return String(env.SFC_WSDL_URL || DEFAULT_SFC_WSDL_URL);
}

export function sfcServiceUrl(env: SafetyEnv = process.env) {
  return String(env.SFC_SERVICE_URL || DEFAULT_SFC_SERVICE_URL);
}

export function sfcCredentialsPresent(env: SafetyEnv = process.env) {
  return Boolean(env.SFC_CUSTOMER_ID && env.SFC_APP_TOKEN && env.SFC_APP_KEY);
}

export function createSfcReadiness(env: SafetyEnv = process.env): SfcReadiness {
  const mode = sfcMode(env);
  const credentialsPresent = sfcCredentialsPresent(env);
  const readOnlyEnabled = enabled(env, "SFC_ENABLE_READ_ONLY_API");
  const mutationsEnabled = enabled(env, "SFC_ENABLE_MUTATIONS");
  const ok = mode === "mock" || (mode === "read_only" && credentialsPresent && readOnlyEnabled && !mutationsEnabled);

  let code: SfcReadinessCode = "sfc_mock_only";
  if (mode === "read_only" && ok) code = "sfc_read_only_ready";
  if (mode !== "mock" && !credentialsPresent) code = "sfc_credentials_missing";
  if (mutationsEnabled) code = "sfc_mutation_blocked";

  return {
    ok,
    provider: "sendfromchina",
    mode,
    code,
    checks: [
      {
        name: "sfc-credentials",
        ok: mode === "mock" || credentialsPresent,
        detail: credentialsPresent ? "SFC credentials are configured; values are not logged." : "SFC credentials are not configured.",
      },
      {
        name: "sfc-read-only-api",
        ok: mode === "mock" || readOnlyEnabled,
        detail: readOnlyEnabled ? "SFC read-only API flag is enabled." : "SFC read-only API flag is disabled.",
      },
      {
        name: "sfc-mutations-disabled",
        ok: !mutationsEnabled,
        detail: mutationsEnabled ? "SFC mutation flag is enabled and must be reviewed." : "SFC mutations are disabled.",
      },
    ],
  };
}
