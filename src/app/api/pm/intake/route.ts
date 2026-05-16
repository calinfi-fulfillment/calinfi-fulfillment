import { NextResponse, type NextRequest } from "next/server";

import { liveMutationFlags } from "@/lib/safety";
import { buildPmIntakePlan } from "@/lib/pm-intake/processor";
import { PmIntakePayloadSchema } from "@/lib/pm-intake/schema";
import { verifyPmIntakeSignature } from "@/lib/pm-intake/signature";
import { getSupabaseServiceRoleClient, hasFulfillmentSupabaseServiceRoleConfig } from "@/lib/supabase/server";
import {
  isPmIntakeSupabasePersistenceEnabled,
  persistPmIntakePayloadWithSupabase,
} from "@/lib/pm-intake/supabase-persistence";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-odun-signature");

  if (!verifyPmIntakeSignature(rawBody, signature, process.env.PM_INTAKE_SHARED_SECRET)) {
    return NextResponse.json({ ok: false, code: "invalid_signature" }, { status: 401 });
  }

  const parsed = PmIntakePayloadSchema.safeParse(JSON.parse(rawBody));

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_pm_intake_payload",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (!liveMutationFlags().FULFILLMENT_ENABLE_PM_INTAKE) {
    return NextResponse.json(
      {
        ok: false,
        code: "pm_intake_disabled",
        sourceOrderKey: `pm:${parsed.data.pledgeId}`,
      },
      { status: 403 },
    );
  }

  if (!isPmIntakeSupabasePersistenceEnabled()) {
    const dryRunPlan = buildPmIntakePlan(parsed.data, []);

    return NextResponse.json(
      {
        ok: false,
        code: "persistence_not_enabled",
        message: hasFulfillmentSupabaseServiceRoleConfig()
          ? "PM intake contract is validated, but live Supabase mutations are disabled."
          : "PM intake contract is validated, but Fulfillment Supabase service-role persistence is not configured.",
        dryRunPlan,
      },
      { status: 503 },
    );
  }

  const result = await persistPmIntakePayloadWithSupabase(getSupabaseServiceRoleClient(), parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        blocked: result.blocked,
        code: result.code,
        plan: result.plan,
        sourceOrderKey: result.sourceOrderKey,
      },
      { status: result.blocked ? 409 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    excludedBuiltinItemCount: result.excludedBuiltinItemCount,
    orderId: result.orderId,
    orderLineCount: result.orderLineCount,
    sourceOrderKey: result.sourceOrderKey,
  });
}
