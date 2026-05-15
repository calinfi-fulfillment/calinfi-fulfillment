# Vercel Staging Setup

This runbook is for a separate ODUN Fulfillment V1 Vercel staging project. Do not link or deploy this app into the existing Pledge Manager or CALINFI production app projects.

## Current Status

- GitHub branch `codex/phase-13-staging` is pushed.
- Draft PR #1 is open: https://github.com/calinfi-fulfillment/calinfi-fulfillment/pull/1
- New Vercel account GitHub import is confirmed for repository `calinfi-fulfillment/calinfi-fulfillment`.
- Current Git-connected main deployment:
  - Project name: `calinfi-fulfillment-5idm`
  - Deployment id: `dpl_FadPJzuqvjNnFMiFaQi6iBqmw9oW`
  - Public URL: https://calinfi-fulfillment-5idm.vercel.app
  - Branch/commit: `main` / `816fb0e`
  - Framework preset: Next.js
  - Root directory: repository root
  - Custom production domain: none
  - Evidence: `docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json`
- Vercel account discovery previously showed existing projects `calinfi-pledge-manager` and `calinfi-production-app`.
- Legacy/manual protected preview project remains verified:
  - Project id: `prj_gxorHDOfctSfP6KcAo6stLzFIkyf`
  - Project name: `odun-fulfillment-v1`
  - Team id: `team_2jOtOHRsgfDrveJXXNwrbnvt`
  - Team slug: `hello-75539063s-projects`
  - Framework preset: Next.js
  - Latest ready preview deployment: `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH`
  - Preview URL: https://odun-fulfillment-v1-d8gd7ptgr-hello-75539063s-projects.vercel.app
  - Custom domains: none
- Local workspace is linked to this Vercel project with `.vercel/`; `.vercel/` is ignored and must not be committed.
- Preview env was configured on the separate Fulfillment project with the non-PM Supabase public URL/key and all live/provider/export/Stripe Checkout flags disabled.
- No service-role key, Stripe live secret, provider API secret, PM production env, or custom production CALINFI domain was added.
- The old Vercel account rejected direct Git connection; this is superseded by the new Vercel account GitHub import above. The protected preview was deployed manually from the local branch.
- Re-check on 2026-05-11 confirmed:
  - GitHub CLI viewer has `ADMIN` permission on `calinfi-fulfillment/calinfi-fulfillment`.
  - `vercel git connect` still fails for the repo.
  - GitHub App installation lookup does not confirm a usable Vercel app installation for this repo.
- Owner confirmed the likely cause was account mismatch; the new account path resolves GitHub import for the current main deployment.
- Local + Supabase staging development can still continue without Vercel dependency; see `docs/runbooks/LOCAL_STAGING_WITHOUT_VERCEL.md`.
- An earlier deployment failed before serving because the project framework preset was `Other`; the preset was corrected to Next.js before the ready preview deployment.

## Required Vercel Project

Create or import a new project, for example:

- Project name: `calinfi-fulfillment-5idm`
- Protected preview project id, if using the legacy manual preview: `prj_gxorHDOfctSfP6KcAo6stLzFIkyf`
- Git repository: `calinfi-fulfillment/calinfi-fulfillment`
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
- 2026-05-15 protected preview deployment `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH` is `READY`.
- `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports` returned HTTP 200 through `vercel curl`.
- `/api/health` reported `blockedPmSupabase: false`, `liveFlagsOff: true`, public Supabase configured, and service-role Supabase not configured.
- No production domain alias is attached.
- No live provider, label, export, Stripe Checkout, or partner push action is enabled.
- Direct anonymous fetches return HTTP 401 because Vercel Deployment Protection is enabled; protected preview smoke used Vercel-authenticated access.
- 2026-05-15 Git-connected main deployment `dpl_FadPJzuqvjNnFMiFaQi6iBqmw9oW` on `calinfi-fulfillment-5idm` returned HTTP 200 for `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports`.
- Main `/api/health` reported live flags off and service-role Supabase not configured.

## Git Integration Maintenance Checklist

Use the Vercel dashboard path if the new account needs repo settings review:

- [x] Git repository `calinfi-fulfillment/calinfi-fulfillment` is connected on the new Vercel account. Verified by `docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json`.
- [ ] Open Vercel project `calinfi-fulfillment-5idm`.
- [ ] If prompted in future, install or update the Vercel GitHub App for the `calinfi-fulfillment` account.
- [ ] Grant access only to `calinfi-fulfillment/calinfi-fulfillment`, not all repositories.
- [ ] Keep framework preset as Next.js and root directory as repository root.
- [ ] Keep production branch as `main`; use PR/non-main branches for previews.
- [ ] Do not attach PM or CALINFI production domains.
- [ ] Do not enable production env, provider API, Stripe Checkout, partner push, or live exports during this step.
- [ ] Optional: trigger or wait for a PR preview on `codex/phase-13-staging`.
- [ ] Verify `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports` through the preview URL.

Post-connect CLI checks:

```bash
npx -y vercel@latest git ls --scope hello-75539063s-projects
npx -y vercel@latest inspect <preview-url> --scope hello-75539063s-projects
npm run check:staging-prep
npm run test:no-secrets
```

## Blockers

- GitHub integration is confirmed on the new Vercel account; keep production env/custom domain rollout gated separately from this Git connection.
- Stripe CLI test account/webhook smoke and app-specific `rk_test_` restricted-key Checkout smoke are complete; persisted Checkout flag remains disabled until explicit staged checkout approval.
- PM production read-only aggregate baseline is complete in aggregate/count-only mode; see `docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json`.
- Formal Sınır Bekçisi pre-pilot audit is complete; next execution gate is the explicit 1-2 allowlisted staging pilot order run approval.
