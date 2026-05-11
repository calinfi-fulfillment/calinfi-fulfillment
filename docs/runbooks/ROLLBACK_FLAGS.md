# Rollback And Flag-Off Runbook

First defense is flag-off, not data deletion.

## Immediate Flag-Off

Set all Phase 2/Fulfillment mutation flags to false:

- `FULFILLMENT_ENABLE_PM_INTAKE=false`
- `FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS=false`
- `FULFILLMENT_ENABLE_PROVIDER_API_QUOTES=false`
- `FULFILLMENT_ENABLE_STRIPE_CHECKOUT=false`
- `FULFILLMENT_ENABLE_HANDOFF_EXPORTS=false`
- `FULFILLMENT_ENABLE_PARTNER_API_PUSH=false`

PM-side Phase 2 flags must also remain false until owner approval.

## Data Handling

- Do not delete payment or quote records from production.
- Void wrong quote/payment records with audit.
- Put mismatched payment events into `payment_review_required`.
- Do not directly edit paid/locked orders; use amendment/review.
- If Fulfillment staging intake is wrong, clean the fresh staging project. PM production data must remain unchanged.

## Recovery Check

After flag-off:

- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Verify `/api/health` shows live mutation flags off.
- Run PM production aggregate/read-only comparison if a pilot was approved.
