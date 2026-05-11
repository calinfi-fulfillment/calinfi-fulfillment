# Vercel Staging Setup

This runbook is for a separate ODUN Fulfillment V1 Vercel staging project. Do not link or deploy this app into the existing Pledge Manager or CALINFI production app projects.

## Current Status

- GitHub branch `codex/phase-13-staging` is pushed.
- Draft PR #1 is open: https://github.com/calinfi-fulfillment/calinfi-fulfillment/pull/1
- Vercel account discovery previously showed existing projects `calinfi-pledge-manager` and `calinfi-production-app`.
- Separate Fulfillment Vercel project is now verified:
  - Project id: `prj_gxorHDOfctSfP6KcAo6stLzFIkyf`
  - Project name: `odun-fulfillment-v1`
  - Team id: `team_2jOtOHRsgfDrveJXXNwrbnvt`
  - Team slug: `hello-75539063s-projects`
  - Framework preset: Next.js
  - Latest ready preview deployment: `dpl_7B3Cbxp5sJoxAgjxRRrSVigCxqHV`
  - Preview URL: https://odun-fulfillment-v1-qpqnp1r8q-hello-75539063s-projects.vercel.app
  - Custom domains: none
- Local workspace is linked to this Vercel project with `.vercel/`; `.vercel/` is ignored and must not be committed.
- Preview env was configured on the separate Fulfillment project with the non-PM Supabase public URL/key and all live/provider/export/Stripe Checkout flags disabled.
- No service-role key, Stripe live secret, provider API secret, PM production env, or custom production CALINFI domain was added.
- GitHub integration is not connected yet; Vercel rejected direct Git connection, so the current preview was deployed manually from the local branch.
- An earlier deployment failed before serving because the project framework preset was `Other`; the preset was corrected to Next.js before the ready preview deployment.

## Required Vercel Project

Create or import a new project, for example:

- Project name: `odun-fulfillment-v1`
- Project id: `prj_gxorHDOfctSfP6KcAo6stLzFIkyf`
- Git repository: `calinfi-fulfillment/calinfi-fulfillment` (currently blocked; manual preview deploy used)
- Framework preset: Next.js
- Root directory: repository root
- Production branch: `main`
- Preview branch source: pull requests / non-main branches

Do not reuse:

- `calinfi-pledge-manager`
- `calinfi-production-app`

## Required Environment Keys

Set these for Preview first. Keep live/provider/export flags disabled. The keys below are configured for Preview on `odun-fulfillment-v1`; values are intentionally not repeated in docs.

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

Completed preview verification:

- Vercel project name is not PM/prod.
- Preview env uses the non-PM Fulfillment Supabase project.
- `/api/health` returned `ok: true` through protected preview access.
- `/` rendered the Staging Pilot Readiness panel through protected preview access.
- `/reports` rendered the reports surface through protected preview access.
- `/api/health` reported `blockedPmSupabase: false`, `liveFlagsOff: true`, public Supabase configured, and service-role Supabase not configured.
- No production domain alias is attached.
- No live provider, label, export, Stripe Checkout, or partner push action is enabled.
- Direct anonymous fetches return HTTP 401 because Vercel Deployment Protection is enabled; protected preview smoke used Vercel-authenticated access.

## Blockers

- GitHub integration must be connected to `calinfi-fulfillment/calinfi-fulfillment` before automatic PR previews can replace manual preview deploys.
- Stripe test account/webhook verification remains pending owner-approved setup.
- PM production read-only aggregate baseline remains pending owner-approved audit.
- Formal Sınır Bekçisi pre-pilot audit remains pending after GitHub integration, Stripe test setup, and PM baseline context are ready.
