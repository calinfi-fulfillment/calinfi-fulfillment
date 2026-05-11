import {
  LIVE_MUTATION_FLAG_KEYS,
  areLiveMutationFlagsDisabled,
  isPledgeManagerSupabaseUrl,
  liveMutationFlags,
  type SafetyEnv,
} from "../safety";

export type PreflightCheck = {
  name: string;
  ok: boolean;
  severity: "blocking" | "warning";
  detail: string;
};

export type PreflightReport = {
  ok: boolean;
  checks: PreflightCheck[];
};

function value(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

function isEnabled(env: SafetyEnv, key: string) {
  return value(env, key) === "true";
}

export function createPreflightReport(env: SafetyEnv = process.env): PreflightReport {
  const supabaseUrl = value(env, "NEXT_PUBLIC_SUPABASE_URL");
  const stripeMode = value(env, "STRIPE_MODE") || "test";
  const flags = liveMutationFlags(env);

  const checks: PreflightCheck[] = [
    {
      name: "pm-supabase-blocklist",
      ok: !supabaseUrl || !isPledgeManagerSupabaseUrl(supabaseUrl, env),
      severity: "blocking",
      detail: supabaseUrl ? "Supabase URL is not the PM production project." : "Supabase URL is empty; local/preview mode.",
    },
    {
      name: "live-mutation-flags",
      ok: areLiveMutationFlagsDisabled(env),
      severity: "blocking",
      detail: LIVE_MUTATION_FLAG_KEYS.filter((key) => flags[key]).join(", ") || "All live mutation flags are disabled.",
    },
    {
      name: "stripe-test-mode",
      ok: stripeMode === "test",
      severity: "blocking",
      detail: `Stripe mode is ${stripeMode}.`,
    },
    {
      name: "provider-api-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_PROVIDER_API_QUOTES"),
      severity: "blocking",
      detail: "Provider API quotes are disabled.",
    },
    {
      name: "partner-push-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_PARTNER_API_PUSH"),
      severity: "blocking",
      detail: "Partner API push is disabled.",
    },
    {
      name: "exports-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_HANDOFF_EXPORTS"),
      severity: "blocking",
      detail: "Live handoff exports are disabled.",
    },
  ];

  return {
    ok: checks.every((check) => check.ok || check.severity === "warning"),
    checks,
  };
}
