import { NextResponse } from "next/server";
import {
  areLiveMutationFlagsDisabled,
  hasFulfillmentSupabasePublicConfig,
  hasFulfillmentSupabaseServiceRoleConfig,
  isPledgeManagerSupabaseUrl,
  liveMutationFlags,
} from "@/lib/safety";

export function GET() {
  const blockedPmSupabase = isPledgeManagerSupabaseUrl();
  const liveFlagsOff = areLiveMutationFlagsDisabled();

  return NextResponse.json({
    ok: !blockedPmSupabase && liveFlagsOff,
    generatedAt: new Date().toISOString(),
    safety: {
      blockedPmSupabase,
      liveFlagsOff,
      liveMutationFlags: liveMutationFlags(),
    },
    supabase: {
      publicConfigured: hasFulfillmentSupabasePublicConfig(),
      serviceRoleConfigured: hasFulfillmentSupabaseServiceRoleConfig(),
    },
  });
}
