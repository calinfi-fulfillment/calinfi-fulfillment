import {
  LIVE_MUTATION_FLAG_KEYS,
  areLiveMutationFlagsDisabled,
  isPledgeManagerSupabaseUrl,
  liveMutationFlags,
  supabaseProjectRefFromUrl,
  type SafetyEnv,
} from "../safety";

export type StagingPrepCheck = {
  name: string;
  ok: boolean;
  severity: "blocking" | "warning";
  detail: string;
};

export type StagingPrepReport = {
  ok: boolean;
  mode: "local_preview" | "staging_ready" | "blocked";
  checks: StagingPrepCheck[];
};

function value(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

function isEnabled(env: SafetyEnv, key: string) {
  return value(env, key) === "true";
}

function envMode(env: SafetyEnv) {
  const supabaseUrl = value(env, "NEXT_PUBLIC_SUPABASE_URL");

  if (!supabaseUrl) return "local_preview" as const;
  if (isPledgeManagerSupabaseUrl(supabaseUrl, env)) return "blocked" as const;

  return "staging_ready" as const;
}

export function createStagingPrepReport(env: SafetyEnv = process.env): StagingPrepReport {
  const mode = envMode(env);
  const supabaseUrl = value(env, "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseRef = supabaseProjectRefFromUrl(supabaseUrl);
  const stripeMode = value(env, "STRIPE_MODE") || "test";
  const flags = liveMutationFlags(env);
  const enabledFlags = LIVE_MUTATION_FLAG_KEYS.filter((key) => flags[key]);
  const checks: StagingPrepCheck[] = [
    {
      name: "supabase-target",
      ok: mode !== "blocked",
      severity: "blocking",
      detail:
        mode === "local_preview"
          ? "Supabase URL is empty; repo remains in local/preview mode."
          : mode === "staging_ready"
            ? `Supabase URL points to non-PM project ${supabaseRef}.`
            : "Supabase URL points to the blocked PM production project.",
    },
    {
      name: "live-mutation-flags",
      ok: areLiveMutationFlagsDisabled(env),
      severity: "blocking",
      detail: enabledFlags.length > 0 ? `Enabled live flags: ${enabledFlags.join(", ")}.` : "All live mutation flags are disabled.",
    },
    {
      name: "stripe-mode",
      ok: stripeMode !== "live",
      severity: "blocking",
      detail: `Stripe mode is ${stripeMode}.`,
    },
    {
      name: "provider-api-quotes-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_PROVIDER_API_QUOTES"),
      severity: "blocking",
      detail: "Provider API quote calls are disabled.",
    },
    {
      name: "stripe-checkout-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_STRIPE_CHECKOUT"),
      severity: "blocking",
      detail: "Stripe Checkout creation is disabled.",
    },
    {
      name: "handoff-exports-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_HANDOFF_EXPORTS"),
      severity: "blocking",
      detail: "Live handoff exports are disabled.",
    },
    {
      name: "partner-api-push-disabled",
      ok: !isEnabled(env, "FULFILLMENT_ENABLE_PARTNER_API_PUSH"),
      severity: "blocking",
      detail: "Partner API push is disabled.",
    },
  ];
  const ok = checks.every((check) => check.ok || check.severity === "warning");

  return {
    ok,
    mode: ok ? mode : "blocked",
    checks,
  };
}
