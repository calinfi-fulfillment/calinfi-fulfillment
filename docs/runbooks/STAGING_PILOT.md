# Staging Pilot Runbook

This runbook prepares Fulfillment V1 for a staging-only pilot. It is not permission to touch PM production, Stripe live mode, provider APIs, partner APIs, exports, labels, or live migrations.

## Preconditions

- Owner explicitly approves creating or connecting a fresh Fulfillment staging Supabase project.
- If Supabase project creation is blocked by org quota, resolve the quota first. Do not fall back to PM production or a non-fresh project without explicit owner approval.
- `NEXT_PUBLIC_SUPABASE_URL` points to a non-PM Supabase project.
- PM Supabase project ref `cjygwbfjekhhvwlyujyj` remains blocklisted.
- Live mutation flags stay `false` until the exact pilot step needs one flag.
- Stripe remains test mode.
- Provider API quotes, partner API push, real exports, labels, and Easyship actions stay disabled.

## Synthetic Pilot Data

Use `fixtures/synthetic-pilot-orders.json`. The fixture contains no real backer names, emails, addresses, phone numbers, tokens, or auth links.

Pilot scenarios:

1. Regional 3PL synthetic order
   - Validate PM intake contract.
   - Resolve `REGIONAL_3PL` / `3PL_INTERNAL_LABEL`.
   - Generate local fake quote.
   - Process signed synthetic payment event.
   - Verify handoff preview.

2. China/HK Direct DDP synthetic order
   - Resolve `CHINA_HK_DIRECT_DDP` / `DIRECT_DDP_PROVIDER`.
   - Verify Product Master customs blockers.
   - Enter manual DDP quote in test mode.
   - Process owner-approved covered payment event only if explicitly approved.

## PM Production Baseline

Before any live pilot, take aggregate/read-only PM baseline only:

- Counts by `pm_backers` status.
- Counts by `pm_pledges` status.
- Counts of payment, delivery, and audit records.
- Counts of Fulfillment intake links.

Do not print raw customer rows, addresses, emails, phone numbers, tokens, auth links, or service keys.

## Stop Conditions

Stop immediately and turn flags off if:

- Any endpoint points at the PM Supabase project.
- Payment amount, currency, quote, or order fingerprint mismatches.
- PM Phase 1 invite/save/login behavior changes.
- Any real provider API, export, label, or partner push would be called.

## Current External Setup Status

- 2026-05-11: Owner approval for a fresh Fulfillment staging Supabase was received.
- 2026-05-11: Supabase CLI project creation was attempted for `odun-fulfillment-v1-staging`.
- 2026-05-11: Initial creation was blocked by the original Supabase organization active free project limit.
- 2026-05-11: Owner provided a new non-PM Supabase project ref `mgdsvapgltzwhsioccqd`; local staging-prep now reports `staging_ready`.
- 2026-05-11: Supabase MCP tools became visible in Codex; migrations `0001_fulfillment_v1_core` and `0002_staging_schema_hardening` were applied to the new staging project.
- 2026-05-11: Required V1 public table surface was verified with `npm run test:staging-schema-public`; this uses zero-row selects and does not read PII rows.
- 2026-05-11: Synthetic pilot fixture was imported into staging with 2 synthetic orders, 1 built-in exclusion, 2 accepted quotes, 2 accepted payment events, and 2 ready handoffs.
- 2026-05-15: Owner approved the next pilot step in the current Codex thread. The 1-2 allowlisted staging pilot order run was closed with `docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json`, `npm run check:staging-prep`, `npm run test:pilot-dry-run`, and `npm run test:staging-pilot-run`; no live provider/payment/label/export mutation was run.
- 2026-05-15: `npm run test:staging-schema-public` now detects that the later inventory migration tables are not yet applied to staging. Do not apply migration `0003_inventory_module.sql` without a separate owner-approved staging schema update window.
