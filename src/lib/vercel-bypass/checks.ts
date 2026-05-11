import {
  areLiveMutationFlagsDisabled,
  hasFulfillmentSupabasePublicConfig,
  isPledgeManagerSupabaseUrl,
  type SafetyEnv,
} from "../safety";

export type VercelBypassCheck = {
  name: string;
  status: "ready" | "blocked_non_critical" | "blocked_pending_approval";
  detail: string;
};

export type VercelBypassReport = {
  mode: "local_staging_without_vercel_git";
  okForDevelopment: boolean;
  okForLaunch: boolean;
  checks: VercelBypassCheck[];
};

export function createVercelBypassReport(env: SafetyEnv = process.env): VercelBypassReport {
  const blockedPmSupabase = isPledgeManagerSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL, env);
  const liveFlagsOff = areLiveMutationFlagsDisabled(env);
  const supabaseReady = hasFulfillmentSupabasePublicConfig(env);

  return {
    mode: "local_staging_without_vercel_git",
    okForDevelopment: !blockedPmSupabase && liveFlagsOff,
    okForLaunch: false,
    checks: [
      {
        name: "vercel-git-integration",
        status: "blocked_non_critical",
        detail: "Blocked by account mismatch; local and Supabase staging development may continue.",
      },
      {
        name: "fulfillment-supabase",
        status: supabaseReady ? "ready" : "blocked_non_critical",
        detail: supabaseReady ? "Non-PM Fulfillment Supabase config is present." : "Missing public Supabase config; local fixture mode only.",
      },
      {
        name: "pm-supabase-guard",
        status: blockedPmSupabase ? "blocked_pending_approval" : "ready",
        detail: blockedPmSupabase ? "PM Supabase project ref is blocked." : "Supabase target is not the PM project.",
      },
      {
        name: "live-actions",
        status: liveFlagsOff ? "ready" : "blocked_pending_approval",
        detail: liveFlagsOff ? "Live mutation, provider, export, and partner flags are off." : "One or more live action flags are enabled.",
      },
      {
        name: "launch-readiness",
        status: "blocked_pending_approval",
        detail: "Production launch still requires Vercel account alignment, PM read-only baseline, final audit, and owner go/no-go.",
      },
    ],
  };
}
