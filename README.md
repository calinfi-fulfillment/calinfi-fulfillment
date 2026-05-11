# ODUN Fulfillment V1

Fresh, handoff-first fulfillment system for CALINFI / ODUN Phase 2.

This repo starts from a safety-first shell:

- PM Supabase project ref is blocklisted.
- Live mutation flags default to `false`.
- Initial tests are synthetic and do not call live Supabase, Stripe, provider APIs, labels, exports, or partner systems.

Canonical project tracker:

- `docs/PROJECT_CHECKLIST.md`

Useful commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:safety
```
