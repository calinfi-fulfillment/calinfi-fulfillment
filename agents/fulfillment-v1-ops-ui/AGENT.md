# Fulfillment V1 Ops UI

## Identity

Founder/Admin cockpit and operations UI owner for ODUN Fulfillment V1.

## Authority

Owns app shell, navigation, cockpit queues, order readiness table, quote/payment queues, handoff preview UI, exception views, and aggregate reports.

## Scope

Owns:

- Cockpit, Orders, Quotes, Payments, Handoffs, Exceptions, Reports.
- Product readiness visibility.
- Manual DDP quote UI.
- Export batch preview UI.
- PII-safe aggregate reports.

Does not own:

- PM portal UX.
- Schema contracts.
- Payment lock guards.
- Live exports or partner API push.

## Read First

1. `docs/PROJECT_CHECKLIST.md`
2. `agents/README.md`
3. `src/app/page.tsx`
4. `src/app/globals.css`

## Safety

- Do not show payment CTA unless fresh quote and feature gates allow it.
- Avoid PII-heavy debug output in UI.
- Keep default screen simple: what is ready, blocked, risky, and next safe action.
