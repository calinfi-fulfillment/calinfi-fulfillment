import { NextResponse, type NextRequest } from "next/server";

import { QuoteValidationRequestSchema } from "@/lib/payment-contract";
import { validateFreshQuoteForPayment, type ShippingQuoteDraft } from "@/lib/route-quote";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = QuoteValidationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_quote_validation_payload",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const quote: ShippingQuoteDraft = {
    ...parsed.data.quote,
    expiresAt: new Date(parsed.data.quote.expiresAt),
  };
  const result = validateFreshQuoteForPayment(
    quote,
    parsed.data.now ? new Date(parsed.data.now) : new Date(),
    parsed.data.currentOrderFingerprint,
  );

  return NextResponse.json({
    ok: true,
    paymentAllowed: result.ok,
    reason: result.reason,
    quoteStatus: result.quote.status,
    totalCents: result.quote.totalCents,
    currency: result.quote.currency,
  });
}
