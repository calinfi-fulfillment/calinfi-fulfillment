# Staging Supabase Setup

This runbook covers the owner-approved fresh Fulfillment staging Supabase setup. It is not permission to use PM production Supabase or an existing non-fresh project.

## Current Status

- Owner approval was given on 2026-05-11 to create a fresh Fulfillment staging Supabase project.
- Initial Supabase CLI project creation was blocked by the original organization active free project limit.
- Owner created a new GitHub/Supabase setup and provided a non-PM Fulfillment Supabase project.
- The owner-provided Supabase project ref is `mgdsvapgltzwhsioccqd`.
- Local `.env.local` now points at the owner-provided non-PM project with only public client config.
- `npm run check:staging-prep` reports `staging_ready` with live/provider/export flags disabled.
- Supabase MCP server `supabase` is configured for project ref `mgdsvapgltzwhsioccqd`, OAuth login completed successfully, and MCP tools are visible in Codex.
- Migrations `0001_fulfillment_v1_core` and `0002_staging_schema_hardening` are applied to staging.
- `npm run test:staging-schema-public` verifies the required V1 public table surface with read-only zero-row selects.
- Synthetic pilot fixture is imported into staging using synthetic-only records; no PM production data or PII was imported.

## Required Owner Decision

Choose one before any future non-synthetic import, provider integration, or production-like mutation:

- Provide a safe migration path using Supabase CLI link credentials or a database connection string.
- Provide service-role credentials only through a local ignored env file or deployment secret manager.
- Keep public publishable keys separate from service-role credentials.
- If using Supabase MCP for future migration/admin operations, verify the MCP tools are still visible in Codex before running any schema mutation.
- Use `npm run test:staging-schema-public` only as a non-mutating surface check; DDL-level checks still require Supabase MCP metadata/advisor verification.

Do not use the PM production project. The blocked PM project ref remains `cjygwbfjekhhvwlyujyj`.

## Safe Creation Procedure

- Generate the DB password locally and store it in macOS Keychain or another secret manager.
- Do not print or commit the DB password, service role key, API keys, auth links, or raw tokens.
- Link the repo only to the fresh Fulfillment staging project.
- Keep `FULFILLMENT_ENABLE_PROVIDER_API_QUOTES=false`, `FULFILLMENT_ENABLE_STRIPE_CHECKOUT=false`, `FULFILLMENT_ENABLE_HANDOFF_EXPORTS=false`, and `FULFILLMENT_ENABLE_PARTNER_API_PUSH=false`.

## Verification After Creation

- `npm run check:staging-prep`
- `npm run test:staging-schema-public`
- `npm test`
- `npm run build`
- PM Supabase blocklist check must pass.
- Synthetic fixture import must run only against the fresh Fulfillment staging project and must remain synthetic-only.
