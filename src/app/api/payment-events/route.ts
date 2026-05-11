import { NextResponse, type NextRequest } from "next/server";

import { liveMutationFlags } from "@/lib/safety";
import { PaymentEventPayloadSchema, processPaymentEvent, verifyPaymentEventSignature } from "@/lib/payment-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-odun-signature");

  if (!verifyPaymentEventSignature(rawBody, signature, process.env.PM_PAYMENT_EVENT_SHARED_SECRET)) {
    return NextResponse.json({ ok: false, code: "invalid_signature" }, { status: 401 });
  }

  const parsed = PaymentEventPayloadSchema.safeParse(JSON.parse(rawBody));

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payment_event_payload",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (!liveMutationFlags().FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS) {
    return NextResponse.json(
      {
        ok: false,
        code: "payment_events_disabled",
        eventId: parsed.data.eventId,
      },
      { status: 403 },
    );
  }

  const result = processPaymentEvent(parsed.data, { seenEventKeys: new Set() });

  return NextResponse.json({
    ok: result.eventStatus === "accepted",
    ...result,
  });
}
