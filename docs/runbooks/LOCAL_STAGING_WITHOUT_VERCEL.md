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
npm run check:pm-intake-manual
npm run test:fulfillment-test-backer
npm run test:vercel-bypass-mode
npm run test:stripe-contract
npm run test:provider-adapter
npm run test:provider-mock-handoff
npm run check:staging-prep
npm run test:no-secrets
```

For PM intake manual testing, keep `FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS=false` unless a separate owner-approved Fulfillment staging Supabase window is open. In owner-approved open mode, only `FULFILLMENT_ENABLE_PM_INTAKE=true` and `FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS=true` may be enabled; provider quotes, Stripe checkout, handoff exports, partner API push, and Easyship shipment creation must stay disabled. `check:pm-intake-manual` is synthetic-only and verifies HMAC, intake flag guards, PM Supabase blocklist, built-in exclusion planning, and locked-order blocking without calling external providers.

`test:fulfillment-test-backer` is the local single-backer launch rehearsal. It posts an HMAC-signed synthetic PM intake payload to the local Fulfillment API, then runs the same test backer through product readiness, stock availability, package planning, local quote, payment lock, mock handoff/tracking, and aggregate reports. Expected local API behavior is `persistence_not_enabled` while live Supabase mutations are disabled, or `pm_intake_persisted` in owner-approved open mode; all downstream steps remain synthetic and `externalActions=none`.

## 2026-05-16 Open Mode

- Fulfillment staging project: `mgdsvapgltzwhsioccqd`.
- Production app/domain: `https://operations.calinfi.com`.
- PM intake and Fulfillment Supabase persistence are enabled.
- Provider/payment/export/partner/Easyship shipment mutation flags remain disabled.
- PM remains separately gated by owner-approved allowlists, so no live PM backer can flow unless PM explicitly allows that backer/pledge.
- Product Master was seeded from PM catalog SKU/title data plus synthetic E2E SKUs; no PM backer PII was imported as Product Master.
- Signed synthetic production smoke persisted only intake rows and verified zero downstream delivery, quote, payment, handoff, and inventory-reservation rows for the smoke order.
