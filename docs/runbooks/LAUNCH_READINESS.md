# Launch Readiness Checklist

Launch readiness is not complete until the owner gives go/no-go approval.

## Environment

- Fulfillment production Supabase is separate from PM production.
- PM production Supabase project ref `cjygwbfjekhhvwlyujyj` is blocklisted.
- Secrets are configured only in the deployment provider, never committed.
- Stripe starts in test mode; live mode requires explicit owner approval.
- Provider API quotes, partner API push, exports, labels, Easyship, warehouse, and 3PL actions are disabled until explicitly approved.

## Required Gates

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Sınır Bekçisi boundary audit
- PM Phase 1 regression check
- Fulfillment staging pilot with synthetic data
- PM production aggregate/read-only baseline comparison

## Go/No-Go

Go only when:

- PM Phase 1 invite/save/login remains unchanged.
- Fulfillment is not connected to PM Supabase.
- Payment lock requires fresh quote and signed event.
- Handoff/export only includes locked and paid orders.
- Rollback and backup procedures are ready.
- Owner explicitly approves launch.
