# Pre-Pilot Boundary Audit

Date: 2026-05-15

Scope: ODUN Fulfillment V1 repo, committed local/staging evidence, protected Vercel preview smoke, and documented staging state. No PM production query, live Supabase mutation, production Vercel deploy, provider mutation, export, label, tracking write, payment capture, SFC order/ASN/product mutation, or production smoke was performed.

## Critical / Blocking

The local code and protected preview boundaries are ready, but the staging pilot is not approved to run yet.

Blocking before pilot:

- PM production read-only aggregate baseline is pending; output must remain aggregate-only and must not print raw PII rows.
- SFC credential rotation or explicit certificate-source review is pending before pilot/prod smoke.

## High

None found in committed code/provider evidence.

Verified closed high-risk evidence:

- Stripe test-mode evidence is present, redacted, `livemode=false`, no charge captured, and persisted Checkout flag remains disabled.
- Easyship evidence is sandbox `/rates` only; shipment, label, export, tracking, and partner push remain disabled.
- SFC evidence is read-only only; `getWarehouse`, `getShippingMethod`, `getStockBySKU`, `getRates`, and 34-SKU visibility checks passed without SOAP fault, WSDL document response, credential echo, raw SOAP storage, or mutation.
- PM Supabase project ref remains blocklisted and completion readiness reports Fulfillment is not configured against the blocked PM Supabase ref.
- Protected Vercel preview deployment `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH` passed `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports`; anonymous direct access remains HTTP 401.

## Medium

- Vercel Git integration remains blocked by account alignment. This blocks automatic PR previews, but not local/staging development.
- Manual/local staging remains the safe continuation path until Vercel Git is corrected.
- Formal Sınır Bekçisi pilot pass should be rerun after PM baseline and SFC certificate review are ready.

## Low / Product Gaps

- SFC canonical ODUN warehouse ID and approved Asia DDP method code(s) still need written provider confirmation before any mutation window.
- Production backup, rollback drill, final audit, owner go/no-go, and production smoke remain launch gates.

## Commands Run

- `npm run test:pre-pilot-boundary-audit`
- `npm run test:checklist`
- `npm run check:completion-readiness`
- `npx -y vercel@latest deploy --yes --scope hello-75539063s-projects`
- anonymous `curl` against `/api/health` on the protected preview
- `npx -y vercel@latest curl ... --deployment https://odun-fulfillment-v1-d8gd7ptgr-hello-75539063s-projects.vercel.app`
- `npx -y vercel@latest logs ... --since 10m --level error --json`

## DB/Schema Observations

- This audit did not read PM production rows.
- Existing staging notes record non-PM Fulfillment Supabase ref `mgdsvapgltzwhsioccqd`, applied V1 migrations, public schema verification, and synthetic pilot fixture import.
- No live migration, import, export, label, provider mutation, payment capture, or production deploy was performed for this audit.

## Suggested Next Fixes

1. Take the owner-approved PM production read-only aggregate baseline with no raw PII rows.
2. Confirm SFC credential rotation or explicit certificate-source review.
3. Rerun `npm run test:pre-pilot-boundary-audit` and `npm run check:completion-readiness`.
4. Only then request owner approval for the 1-2 allowlisted staging pilot order run.

## Skill Memory Updated

Yes. `calinfi-pm-fulfillment-auditor` should record this as a local/staging pre-pilot audit readiness pass with two remaining external blockers: PM aggregate baseline and SFC certificate review.
