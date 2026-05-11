# ODUN Fulfillment V1 Agent Workspace

These role files split Fulfillment V1 work into small, reviewable scopes. They are planning and handoff contracts, not permission to run live migrations, imports, provider APIs, Stripe live mode, exports, labels, or PM production mutations.

## Roles

- `fulfillment-v1-coordinator`: sequencing, checklist updates, boundary routing.
- `fulfillment-v1-core-data`: schema, domain types, intake persistence, Product Master readiness.
- `fulfillment-v1-route-quote`: route resolver, quote adapters, quote expiry/buffer rules.
- `fulfillment-v1-payment`: PM payment event contract, idempotency, lock guards.
- `fulfillment-v1-ops-ui`: cockpit, queues, founder/admin workflows.
- `fulfillment-v1-qa-safety`: regression suite, PM Supabase guard, PII-safe verification.

## Shared Rules

- PM production Supabase project ref `cjygwbfjekhhvwlyujyj` stays blocklisted.
- Live mutation flags default to `false`.
- Store no secrets, tokens, OTPs, raw auth links, service-role keys, or PII-heavy examples.
- Use synthetic fixtures before any staging or pilot data.
- Update `docs/PROJECT_CHECKLIST.md` only after verification.
