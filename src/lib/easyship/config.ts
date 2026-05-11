import type { SafetyEnv } from "../safety";

export type EasyshipMode = "mock" | "sandbox" | "production";

export type EasyshipReadinessCode =
  | "easyship_mock_only"
  | "easyship_sandbox_ready"
  | "easyship_production_blocked"
  | "easyship_token_missing"
  | "easyship_live_flags_enabled";

export type EasyshipReadiness = {
  ok: boolean;
  provider: "easyship";
  mode: EasyshipMode;
  code: EasyshipReadinessCode;
  apiBaseUrl: string;
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
};

const DEFAULT_EASYSHIP_API_BASE_URL = "https://public-api.easyship.com/2024-09";
const DEFAULT_EASYSHIP_SANDBOX_API_BASE_URL = "https://public-api-sandbox.easyship.com/2024-09";

function envValue(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

function enabled(env: SafetyEnv, key: string) {
  return envValue(env, key) === "true";
}

export function easyshipMode(env: SafetyEnv = process.env): EasyshipMode {
  const mode = envValue(env, "EASYSHIP_MODE");

  if (mode === "sandbox" || mode === "production") return mode;
  return "mock";
}

export function easyshipApiBaseUrl(env: SafetyEnv = process.env) {
  const explicit = envValue(env, "EASYSHIP_API_BASE_URL");
  if (explicit) return explicit;

  return easyshipMode(env) === "sandbox" ? DEFAULT_EASYSHIP_SANDBOX_API_BASE_URL : DEFAULT_EASYSHIP_API_BASE_URL;
}

export function easyshipApiToken(env: SafetyEnv = process.env) {
  return envValue(env, "EASYSHIP_API_TOKEN");
}

export function createEasyshipReadiness(env: SafetyEnv = process.env): EasyshipReadiness {
  const mode = easyshipMode(env);
  const apiBaseUrl = easyshipApiBaseUrl(env);
  const tokenPresent = easyshipApiToken(env).length > 0;
  const ratesEnabled = enabled(env, "EASYSHIP_ENABLE_RATES");
  const shipmentsEnabled = enabled(env, "EASYSHIP_ENABLE_SHIPMENTS");
  const trackingEnabled = enabled(env, "EASYSHIP_ENABLE_TRACKING");
  const providerQuotesEnabled = enabled(env, "FULFILLMENT_ENABLE_PROVIDER_API_QUOTES");
  const partnerPushEnabled = enabled(env, "FULFILLMENT_ENABLE_PARTNER_API_PUSH");
  const liveFlagsEnabled = providerQuotesEnabled || partnerPushEnabled || shipmentsEnabled || trackingEnabled;
  const checks = [
    {
      name: "mode",
      ok: mode !== "production",
      detail: mode === "production" ? "Production Easyship mode is blocked for this phase." : `Easyship mode is ${mode}.`,
    },
    {
      name: "sandbox-token",
      ok: mode === "mock" || tokenPresent,
      detail: tokenPresent ? "Easyship token is present in env; value is not logged." : "Easyship token is not configured.",
    },
    {
      name: "rates-flag",
      ok: mode === "mock" || ratesEnabled,
      detail: ratesEnabled ? "Easyship rate calls flag is enabled." : "Easyship rate calls flag is disabled.",
    },
    {
      name: "shipments-disabled",
      ok: !shipmentsEnabled,
      detail: shipmentsEnabled ? "Easyship shipment creation is enabled and must be reviewed." : "Easyship shipment creation is disabled.",
    },
    {
      name: "tracking-disabled",
      ok: !trackingEnabled,
      detail: trackingEnabled ? "Easyship tracking calls are enabled and must be reviewed." : "Easyship tracking calls are disabled.",
    },
    {
      name: "partner-push-disabled",
      ok: !partnerPushEnabled,
      detail: partnerPushEnabled ? "Partner API push is enabled and must be reviewed." : "Partner API push is disabled.",
    },
  ];

  if (mode === "production") {
    return {
      ok: false,
      provider: "easyship",
      mode,
      code: "easyship_production_blocked",
      apiBaseUrl,
      checks,
    };
  }

  if (liveFlagsEnabled && mode !== "sandbox") {
    return {
      ok: false,
      provider: "easyship",
      mode,
      code: "easyship_live_flags_enabled",
      apiBaseUrl,
      checks,
    };
  }

  if (mode === "sandbox" && !tokenPresent) {
    return {
      ok: false,
      provider: "easyship",
      mode,
      code: "easyship_token_missing",
      apiBaseUrl,
      checks,
    };
  }

  if (mode === "sandbox" && ratesEnabled && !shipmentsEnabled && !trackingEnabled && !partnerPushEnabled) {
    return {
      ok: true,
      provider: "easyship",
      mode,
      code: "easyship_sandbox_ready",
      apiBaseUrl,
      checks,
    };
  }

  return {
    ok: mode === "mock",
    provider: "easyship",
    mode,
    code: "easyship_mock_only",
    apiBaseUrl,
    checks,
  };
}
