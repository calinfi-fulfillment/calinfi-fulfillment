# Local Staging Without Vercel

This runbook keeps ODUN Fulfillment V1 moving if Vercel preview/deploy automation is unavailable. The original account mismatch was resolved separately by importing the repo into a new Vercel account.

## Current Mode

- Development runs local app + Fulfillment staging Supabase.
- Vercel Git integration is not a development blocker.
- Vercel Git integration is confirmed on the new account, but production env/custom domain rollout remains a separate launch gate.
- No PM production mutation, Stripe live mode, provider live API, partner push, export, label, or Easyship action is allowed.

## Allowed Work

- Local frontend and API contract development.
- Supabase staging schema/readiness checks against the non-PM project.
- Synthetic fixture dry-runs.
- Stripe test contract validation without creating Checkout sessions.
- Mock provider rates, handoff, and tracking previews.
- PII-safe reports and aggregate-only audit preparation.

## Disabled Work

- Vercel production promotion dependency when local/staging checks are sufficient.
- Stripe live mode or real Checkout creation.
- Provider API quote calls without sandbox credentials and explicit owner approval.
- Partner API push, live exports, label creation, or tracking writes.
- Additional PM production baseline runs beyond the recorded aggregate evidence unless owner-approved read-only aggregate scope is confirmed again.

## Verification

Use these checks after any local-staging implementation pass:

```bash
npm run test:vercel-bypass-mode
npm run test:stripe-contract
npm run test:provider-adapter
npm run test:provider-mock-handoff
npm run check:staging-prep
npm run test:no-secrets
```
