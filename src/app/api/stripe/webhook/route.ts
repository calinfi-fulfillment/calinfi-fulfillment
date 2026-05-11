import { NextResponse, type NextRequest } from "next/server";

import { verifyAndHandleStripeTestWebhook } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

function statusFor(code: string) {
  if (code === "stripe_webhook_verified_pending_context") return 202;
  if (code === "stripe_signature_missing" || code === "stripe_signature_invalid" || code === "stripe_signature_stale") return 401;
  if (code === "stripe_webhook_secret_missing" || code === "stripe_webhook_secret_invalid" || code === "stripe_live_mode_blocked") {
    return 403;
  }
  if (code === "stripe_webhook_event_unsupported") return 202;
  return 400;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = verifyAndHandleStripeTestWebhook({
    rawBody,
    signatureHeader: request.headers.get("stripe-signature"),
  });

  return NextResponse.json(result, { status: statusFor(result.code) });
}
