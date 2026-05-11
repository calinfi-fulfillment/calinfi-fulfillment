# Vercel Staging Setup

This runbook is for a separate ODUN Fulfillment V1 Vercel staging project. Do not link or deploy this app into the existing Pledge Manager or CALINFI production app projects.

## Current Status

- GitHub branch `codex/phase-13-staging` is pushed.
- Draft PR #1 is open: https://github.com/calinfi-fulfillment/calinfi-fulfillment/pull/1
- Vercel account discovery currently shows existing projects `calinfi-pledge-manager` and `calinfi-production-app`.
- No separate Fulfillment Vercel project is linked yet.
- Local Vercel CLI is not installed in this workspace.

## Required Vercel Project

Create or import a new project, for example:

- Project name: `odun-fulfillment-v1`
- Git repository: `calinfi-fulfillment/calinfi-fulfillment`
- Framework preset: Next.js
- Root directory: repository root
- Production branch: `main`
- Preview branch source: pull requests / non-main branches

Do not reuse:

- `calinfi-pledge-manager`
- `calinfi-production-app`

## Required Environment Keys

Set these for Preview first. Keep live/provider/export flags disabled.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
PM_SUPABASE_BLOCKED_PROJECT_REF=cjygwbfjekhhvwlyujyj
STRIPE_MODE=test
PM_PHASE2_PAYMENTS_ENABLED=false
PM_FULFILLMENT_API_ENABLED=false
STRIPE_CHECKOUT_ENABLED=false
PM_FULFILLMENT_SYNC_ENABLED=false
FULFILLMENT_ENABLE_PM_INTAKE=false
FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS=false
FULFILLMENT_ENABLE_PROVIDER_API_QUOTES=false
FULFILLMENT_ENABLE_STRIPE_CHECKOUT=false
FULFILLMENT_ENABLE_HANDOFF_EXPORTS=false
FULFILLMENT_ENABLE_PARTNER_API_PUSH=false
```

Only add service-role or DB connection secrets if a server-side mutation path is being explicitly tested. Never expose them as `NEXT_PUBLIC_*`.

## Verification

After the project exists and the preview deployment runs:

- Vercel project name is not PM/prod.
- Preview env uses the non-PM Fulfillment Supabase project.
- `npm run check:staging-prep` semantics remain true in deployment.
- `/api/health` returns healthy.
- `/` renders the Staging Pilot Readiness panel.
- No production domain alias is attached.
- No live provider, label, export, Stripe Checkout, or partner push action is enabled.

## Blockers

- Separate Fulfillment Vercel project must be created or imported.
- Preview env vars must be set in Vercel.
- Deployment smoke must run against the preview URL before any production promotion.
