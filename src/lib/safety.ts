export const DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF = "cjygwbfjekhhvwlyujyj";

export const LIVE_MUTATION_FLAG_KEYS = [
  "FULFILLMENT_ENABLE_PM_INTAKE",
  "FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS",
  "FULFILLMENT_ENABLE_PROVIDER_API_QUOTES",
  "FULFILLMENT_ENABLE_STRIPE_CHECKOUT",
  "FULFILLMENT_ENABLE_HANDOFF_EXPORTS",
  "FULFILLMENT_ENABLE_PARTNER_API_PUSH",
] as const;

export type LiveMutationFlagKey = (typeof LIVE_MUTATION_FLAG_KEYS)[number];
export type SafetyEnv = Partial<Record<string, string | undefined>>;

function envValue(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

export function supabaseProjectRefFromUrl(value: string | undefined) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    const [projectRef] = url.hostname.split(".");
    return projectRef ?? "";
  } catch {
    return "";
  }
}

export function pmSupabaseBlockedProjectRef(env: SafetyEnv = process.env) {
  return envValue(env, "PM_SUPABASE_BLOCKED_PROJECT_REF") || DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF;
}

export function isPledgeManagerSupabaseUrl(value = process.env.NEXT_PUBLIC_SUPABASE_URL, env: SafetyEnv = process.env) {
  return supabaseProjectRefFromUrl(value) === pmSupabaseBlockedProjectRef(env);
}

export function hasFulfillmentSupabasePublicConfig(env: SafetyEnv = process.env) {
  return Boolean(
    envValue(env, "NEXT_PUBLIC_SUPABASE_URL") &&
      (envValue(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || envValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")) &&
      !isPledgeManagerSupabaseUrl(envValue(env, "NEXT_PUBLIC_SUPABASE_URL"), env),
  );
}

export function fulfillmentSupabasePublishableKey(env: SafetyEnv = process.env) {
  return envValue(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || envValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function hasFulfillmentSupabaseServiceRoleConfig(env: SafetyEnv = process.env) {
  return Boolean(
    envValue(env, "NEXT_PUBLIC_SUPABASE_URL") &&
      envValue(env, "SUPABASE_SERVICE_ROLE_KEY") &&
      !isPledgeManagerSupabaseUrl(envValue(env, "NEXT_PUBLIC_SUPABASE_URL"), env),
  );
}

export function liveMutationFlags(env: SafetyEnv = process.env) {
  return Object.fromEntries(
    LIVE_MUTATION_FLAG_KEYS.map((key) => [key, envValue(env, key) === "true"]),
  ) as Record<LiveMutationFlagKey, boolean>;
}

export function areLiveMutationFlagsDisabled(env: SafetyEnv = process.env) {
  return Object.values(liveMutationFlags(env)).every((enabled) => !enabled);
}

export function assertNotPledgeManagerSupabaseUrl(value = process.env.NEXT_PUBLIC_SUPABASE_URL, env: SafetyEnv = process.env) {
  if (isPledgeManagerSupabaseUrl(value, env)) {
    throw new Error("ODUN Fulfillment V1 cannot connect to the live Pledge Manager Supabase project.");
  }
}
