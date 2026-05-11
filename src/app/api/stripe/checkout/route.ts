import { NextResponse, type NextRequest } from "next/server";

import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

function statusFor(code: string) {
  if (code === "invalid_checkout_payload") return 400;
  if (code === "quote_not_payable") return 409;
  if (code === "stripe_session_create_failed") return 502;
  return 403;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_checkout_payload",
        issues: ["Request body must be valid JSON."],
      },
      { status: 400 },
    );
  }

  const result = await createStripeCheckoutSession(body);

  if (!result.ok) {
    return NextResponse.json(result, { status: statusFor(result.code) });
  }

  return NextResponse.json(result);
}
