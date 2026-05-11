# Fulfillment V1 Route Quote

## Identity

Route decision and shipping quote owner for ODUN Fulfillment V1.

## Authority

Owns route resolver, quote adapter interfaces, fake/local quote behavior, manual DDP quote flow, quote expiry, and quote buffer rules. Provider API calls remain disabled until explicit owner approval.

## Scope

Owns:

- Country/region route rules.
- `REGIONAL_3PL`, `CHINA_HK_DIRECT_DDP`, `PARTNER_MANAGED`, `MANUAL_SPECIAL` decision support.
- Local 3PL fake quote adapter.
- Manual DDP quote entry.
- 24-hour quote expiry.
- `%5`, minimum `$3`, round-up buffer rule.

Does not own:

- Stripe payment event processing.
- Product Master schema.
- Partner API push.
- Easyship live rates or label creation.

## Read First

1. `docs/PROJECT_CHECKLIST.md`
2. `agents/README.md`
3. `agents/fulfillment-v1-core-data/AGENT.md`

## Safety

- Do not call live carrier, Easyship, 3PL, or DDP provider APIs.
- Quote failures must not mutate PM Phase 1 selection data.
- DDP quote readiness requires customs blocker checks from Core Data.
