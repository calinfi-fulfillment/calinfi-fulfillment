# Pre-Pilot Boundary Audit

Date: 2026-05-15

Scope: ODUN Fulfillment V1 repo, committed local/staging evidence, PM production aggregate/count baseline, protected Vercel preview smoke, and documented staging state. No PM production raw-row query, live Supabase mutation, production Vercel deploy, provider mutation, export, label, tracking write, payment capture, SFC order/ASN/product mutation, or production smoke was performed.

## Critical / Blocking

The local code and protected preview boundaries are ready, but the staging pilot is not approved to run yet.

Blocking before pilot:

- SFC credential rotation or explicit certificate-source review is pending before pilot/prod smoke.

## High

None found in committed code/provider evidence.

Verified closed high-risk evidence:

- Stripe test-mode evidence is present, redacted, `livemode=false`, no charge captured, and persisted Checkout flag remains disabled.
- Easyship evidence is sandbox `/rates` only; shipment, label, export, tracking, and partner push remain disabled.
- SFC evidence is read-only only; `getWarehouse`, `getShippingMethod`, `getStockBySKU`, `getRates`, and 34-SKU visibility checks passed without SOAP fault, WSDL document response, credential echo, raw SOAP storage, or mutation.
- PM production aggregate-only baseline is present at `docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json`; it records counts only, prints/stores no raw PII or sensitive values, confirms PM->Fulfillment sync disabled, and shows zero fulfillment intake links.
- PM Supabase project ref remains blocklisted and completion readiness reports Fulfillment is not configured against the blocked PM Supabase ref.
- Protected Vercel preview deployment `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH` passed `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports`; anonymous direct access remains HTTP 401.
- New Vercel account GitHub import is confirmed by `docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json`; main deployment `dpl_FadPJzuqvjNnFMiFaQi6iBqmw9oW` passed the same 7-route public smoke with live flags off and no service-role Supabase configured.

## Medium

- Formal Sınır Bekçisi pilot pass should be rerun after SFC certificate review is ready.

## Low / Product Gaps

- SFC canonical ODUN warehouse ID and approved Asia DDP method code(s) still need written provider confirmation before any mutation window.
- Production backup, rollback drill, final audit, owner go/no-go, and production smoke remain launch gates.

## Commands Run

- `npm run test:pre-pilot-boundary-audit`
- `npm run test:checklist`
- `npm run check:completion-readiness`
- PM repo `npm run verify:live`
- PM production aggregate count probes using Supabase count/head reads only
- `npm run check:sfc-read-only-env`
- public Node `fetch` smoke against `https://calinfi-fulfillment-5idm.vercel.app`
- `npx -y vercel@latest deploy --yes --scope hello-75539063s-projects`
- anonymous `curl` against `/api/health` on the protected preview
- `npx -y vercel@latest curl ... --deployment https://odun-fulfillment-v1-d8gd7ptgr-hello-75539063s-projects.vercel.app`
- `npx -y vercel@latest logs ... --since 10m --level error --json`

## DB/Schema Observations

- PM production baseline read aggregate/count metadata only. Counts recorded: `pm_backers=446`, `pm_pledges=28`, `pm_pledge_items=76`, `pm_addresses=28`, `pm_email_events=93`, `pm_audit_events=201`, fulfillment `backers=0`, `orders=0`, `order_lines=0`, and `excluded_builtin_items=0`.
- PM invite-status counts reconcile to 446 total backers: pending 362, sent 42, accepted 42, disabled 0.
- PM pledge-status counts reconcile to 28 total pledges: draft 1, selection_submitted 27, and zero fulfillment-ready/locked/payment-pending/manual-hold/cancelled pledges.
- Existing staging notes record non-PM Fulfillment Supabase ref `mgdsvapgltzwhsioccqd`, applied V1 migrations, public schema verification, and synthetic pilot fixture import.
- No live migration, import, export, label, provider mutation, payment capture, or production deploy was performed for this audit.

## Suggested Next Fixes

1. Confirm SFC credential rotation or explicit certificate-source review.
2. Rerun `npm run test:pre-pilot-boundary-audit` and `npm run check:completion-readiness`.
3. Only then request owner approval for the 1-2 allowlisted staging pilot order run.

## Skill Memory Updated

Yes. `calinfi-pm-fulfillment-auditor` should record this as a local/staging pre-pilot audit readiness pass with PM aggregate baseline complete and one remaining external blocker: SFC certificate review.
