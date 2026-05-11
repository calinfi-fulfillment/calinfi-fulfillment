# ODUN Fulfillment V1 Project Checklist

Last updated: 2026-05-11

## Kullanım Kuralı

Bu dosya ODUN Fulfillment V1 için canonical proje checklist'idir. Her implementation turunun sonunda:

- Tamamlanan maddeler `[x]` yapılır.
- Blokaj varsa aynı satıra `BLOCKED: ...` notu eklenir.
- Hiçbir madde test, build, script, static inspection veya açık verification kanıtı olmadan tamamlandı sayılmaz.
- Live Supabase, Stripe, provider API, export, deploy veya migration aksiyonları owner onayı olmadan yapılmaz.
- Secrets, tokens, OTP, raw auth links veya PII-heavy örnekler bu repo/dokümanlara yazılmaz.

## 0. Safety & Governance

- [x] PM canlı Supabase project ref blocklist doğrulandı. Verified by `npm run test:pm-supabase-guard`.
- [x] Tüm live mutation flags default `false`. Verified by `.env.example` and `npm run test:live-flags`.
- [x] No-secrets/no-PII logging kuralı dokümante edildi. Verified by this checklist usage rule.
- [x] Sınır Bekçisi audit gate checklist'i eklendi. See "Audit Gates" below.

## 1. New Repo Bootstrap

- [x] `/Users/ersin/Documents/New project 5/odun-fulfillment-v1` oluşturuldu. Verified by directory creation.
- [x] Fresh Next.js + TypeScript app kuruldu. Verified by `npm run typecheck` and `npm run build`.
- [x] Supabase, zod, lucide/shadcn temel bağımlılıkları eklendi. Verified by `package-lock.json` after `npm install`.
- [x] `typecheck`, `lint`, `build`, `test:*` scriptleri hazır. Verified by `npm run test:safety`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] `.env.example` güvenli default flag'lerle oluşturuldu. Verified by `npm run test:live-flags`.

## 2. Agent Workspace

- [x] `fulfillment-v1-coordinator` role file hazır. Verified by `test -f agents/fulfillment-v1-coordinator/AGENT.md`.
- [x] `fulfillment-v1-core-data` role file hazır. Verified by `test -f agents/fulfillment-v1-core-data/AGENT.md`.
- [x] `fulfillment-v1-route-quote` role file hazır. Verified by `test -f agents/fulfillment-v1-route-quote/AGENT.md`.
- [x] `fulfillment-v1-payment` role file hazır. Verified by `test -f agents/fulfillment-v1-payment/AGENT.md`.
- [x] `fulfillment-v1-ops-ui` role file hazır. Verified by `test -f agents/fulfillment-v1-ops-ui/AGENT.md`.
- [x] `fulfillment-v1-qa-safety` role file hazır. Verified by `test -f agents/fulfillment-v1-qa-safety/AGENT.md`.

## 3. Core Schema & Domain

- [x] V1 Supabase migration tasarlandı. Verified by `npm run test:schema`.
- [x] `products`, `backers`, `orders`, `order_lines` hazır. Verified by `supabase/migrations/0001_fulfillment_v1_core.sql` and `npm run test:schema`.
- [x] `excluded_builtin_items` hazır. Verified by `supabase/migrations/0001_fulfillment_v1_core.sql` and `npm run test:schema`.
- [x] `route_rules`, `shipping_quotes`, `payment_events` hazır. Verified by `supabase/migrations/0001_fulfillment_v1_core.sql` and `npm run test:schema`.
- [x] `fulfillment_handoffs`, `handoff_status_events`, `issues`, `audit_log` hazır. Verified by `supabase/migrations/0001_fulfillment_v1_core.sql` and `npm run test:schema`.
- [x] Domain enums/types tek kaynakta toplandı. Verified by `src/lib/domain/types.ts` and `npm run test:schema`.

## 4. PM Intake

- [x] `POST /api/pm/intake` endpoint'i tasarlandı. Verified by `npm run build`; route listed as `/api/pm/intake`.
- [x] Signed request validation eklendi. Verified by `npm run test:intake` and unsigned local smoke returning HTTP 401.
- [x] Idempotent `pm:<pledge_id>` source key davranışı test edildi. Verified by `npm run test:intake`.
- [x] Built-in item visibility + physical exclusion test edildi. Verified by `npm run test:built-ins`.
- [x] Missing SKU/Product Master blocker test edildi. Verified by `npm run test:built-ins`.

## 5. Product Readiness

- [x] Product Master required fields tanımlandı. Verified by `src/lib/product-readiness/checks.ts` and `npm run test:product-readiness`.
- [x] Weight/dimensions readiness check eklendi. Verified by `npm run test:product-readiness`.
- [x] DDP customs blocker check eklendi. Verified by `npm run test:product-readiness`.
- [x] Readiness issues cockpit'e bağlandı. Verified by `src/lib/ops-cockpit/readiness.ts`, `src/app/page.tsx`, and local page smoke.

## 6. Route & Quote

- [x] Country/region route resolver hazır. Verified by `npm run test:route-quote` and `npm run test:manual-ddp`.
- [x] Local 3PL fake quote adapter hazır. Verified by `npm run test:route-quote`.
- [x] Partner API adapter interface hazır. Verified by `src/lib/route-quote/types.ts` and `src/lib/route-quote/quotes.ts`.
- [x] Manual DDP quote flow hazır. Verified by `npm run test:manual-ddp`.
- [x] 24 saat quote expiry kuralı eklendi. Verified by `npm run test:route-quote` and `npm run test:manual-ddp`.
- [x] `%5`, minimum `$3`, round-up buffer kuralı eklendi. Verified by `npm run test:route-quote` and `npm run test:manual-ddp`.
- [x] Expired/changed order quote void behavior test edildi. Verified by `npm run test:route-quote`.

## 7. PM Payment Contract

- [x] PM Payment Due contract dokümante edildi. Verified by `docs/contracts/PM_PAYMENT_DUE.md`.
- [x] Fresh quote validation API hazır. Verified by `npm run test:payment-contract`, `npm run build`, and local invalid-payload smoke returning HTTP 400.
- [x] Stripe Checkout metadata contract hazır. Verified by `StripeCheckoutMetadataSchema` and `npm run test:payment-contract`.
- [x] PM tarafında ödeme CTA sadece fresh quote ile açılacak şekilde tanımlandı. Verified by `docs/contracts/PM_PAYMENT_DUE.md` and `validateFreshQuoteForPayment`.

## 8. Payment Event & Lock

- [x] `POST /api/payment-events` endpoint'i hazır. Verified by `npm run build`; route listed as `/api/payment-events`.
- [x] Signed PM payment event doğrulaması eklendi. Verified by `npm run test:payment-lock` and unsigned local smoke returning HTTP 401.
- [x] Amount/currency/quote/order match guard eklendi. Verified by `npm run test:payment-lock`.
- [x] Duplicate webhook idempotency test edildi. Verified by `npm run test:payment-lock`.
- [x] Mismatch `payment_review_required` üretir, lock yapmaz. Verified by `npm run test:payment-lock`.
- [x] Successful payment `locked_for_fulfillment` yapar. Verified by `npm run test:payment-lock`.

## 9. Ops UI

- [x] App shell ve nav hazır: Cockpit, Orders, Quotes, Payments, Handoffs, Exceptions, Reports. Verified by `npm run test:ops-ui`, `npm run build`, and local route smoke.
- [x] Cockpit queue cards hazır. Verified by `src/app/page.tsx` and `npm run test:ops-ui`.
- [x] Orders readiness table hazır. Verified by `src/app/orders/page.tsx` and local `/orders` smoke.
- [x] Quotes queue ve manual DDP quote UI hazır. Verified by `src/app/quotes/page.tsx` and local `/quotes` smoke.
- [x] Payments queue hazır. Verified by `src/app/payments/page.tsx` and local `/payments` smoke.
- [x] Exceptions queue hazır. Verified by `src/app/exceptions/page.tsx` and local `/exceptions` smoke.

## 10. Handoff & Export

- [x] Only locked orders export-ready olur. Verified by `npm run test:handoff`.
- [x] Export batch preview hazır. Verified by `createHandoffPreview` and `npm run test:handoff`.
- [x] CSV/JSON export hazır. Verified by `exportHandoffCsv`, `exportHandoffJson`, and `npm run test:handoff`.
- [x] Handoff statuses hazır: exported, accepted, in fulfillment, shipped, delivered, exception. Verified by domain enums and `npm run test:schema`.
- [x] Partner API push future-gated bırakıldı. Verified by `FULFILLMENT_ENABLE_PARTNER_API_PUSH=false` default and `npm run test:handoff`.

## 11. Reports

- [x] Ready/blocked/payment/handoff summary raporu hazır. Verified by `npm run test:reports`.
- [x] Partner/route performance summary hazır. Verified by `npm run test:reports`.
- [x] Exception aging raporu hazır. Verified by `npm run test:reports`.
- [x] PII-safe aggregate output doğrulandı. Verified by `assertPiiSafeAggregateOutput` and `npm run test:reports`.

## 12. QA & Safety

- [x] `test:pm-supabase-guard` geçti. Verified by `npm run test:safety`.
- [x] `test:schema` geçti. Verified by `npm test`.
- [x] `test:intake` geçti. Verified by `npm test`.
- [x] `test:built-ins` geçti. Verified by `npm test`.
- [x] `test:product-readiness` geçti. Verified by `npm test`.
- [x] `test:route-quote` geçti. Verified by `npm test`.
- [x] `test:manual-ddp` geçti. Verified by `npm test`.
- [x] `test:payment-contract` geçti. Verified by `npm test`.
- [x] `test:payment-lock` geçti. Verified by `npm test`.
- [x] `test:ops-ui` geçti. Verified by `npm test`.
- [x] `test:handoff` geçti. Verified by `npm test`.
- [x] `test:reports` geçti. Verified by `npm test`.
- [x] `test:staging-launch-gates` geçti. Verified by `npm test`.
- [x] `test:staging-prep` geçti. Verified by `npm test`.
- [x] `test:preflight` geçti. Verified by `npm test`.
- [x] `test:pilot-dry-run` geçti. Verified by `npm test`.
- [x] `test:no-secrets` geçti. Verified by `npm test`.
- [x] `check:preflight` geçti. Verified by current local env preflight.
- [x] `typecheck`, `lint`, `build` geçti. Verified by `npm run typecheck`, `npm run lint`, and `npm run build`.

## Verification Log

2026-05-11 bootstrap checks:

- `npm install` passed. Note: npm audit reported 2 moderate dependency vulnerabilities; no forced upgrade was applied.
- `npm run test:safety` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local dev server verified at `http://localhost:3105`; `/` and `/api/health` returned HTTP 200 with live mutation flags disabled.
- Agent role files verified with `test -f` checks under `agents/fulfillment-v1-*`.
- Core schema/domain checks passed with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`; migration was not applied to any live database.
- PM intake contract checks passed with `npm test`; local `/api/pm/intake` unsigned smoke returned HTTP 401 and no persistence path is enabled.
- Product readiness checks passed with `npm test`; local cockpit page shows the Product Readiness queue binding.
- Route/quote checks passed with `npm test`; only fake/manual adapters were exercised, no provider API was called.
- PM payment contract checks passed with `npm test`; local `/api/quotes/validate` invalid payload smoke returned HTTP 400.
- Payment event/lock checks passed with `npm test`; local `/api/payment-events` unsigned smoke returned HTTP 401.
- Ops UI checks passed with `npm test`; local routes `/`, `/orders`, `/quotes`, `/payments`, `/handoffs`, `/exceptions`, and `/reports` returned HTTP 200.
- Handoff/export checks passed with `npm test`; no file export was written and no partner API was called.
- Reports checks passed with `npm test`; aggregate output was PII-safe in regression.
- Staging/launch dry-run gates passed with `npm test`; runbooks and synthetic fixture are present, but no staging Supabase, Stripe account, PM production baseline, deploy, or live provider action was performed.
- Preflight regression, synthetic pilot dry-run, and no-secrets scan passed with `npm test`; `npm run check:preflight` passed against the current local env.
- Local Sınır Bekçisi-style boundary audit note added at `docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md`.
- Frontend cockpit pass added Next Safe Action, DDP/manual route review, and Product Master readiness blocker panels; verified by `npm run test:ops-ui`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and local `/` HTTP 200 smoke.
- Comprehensive frontend control pass replaced static tables with searchable/filterable/selectable interactive queues, added a local-only Ops Command Center, enabled Manual DDP quote staging, and upgraded Reports with range/route controls plus aggregate preview; verified by `npm run test:ops-ui`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and local `/`, `/quotes`, `/reports` smoke checks.
- Workflow frontend pass added Orders readiness staging, Payment event guard review, Handoff export builder, Exception triage desk, and provider API readiness/mock handshake surfaces; verified by `npm test`, `npm run build`, and local `/orders`, `/payments`, `/handoffs`, `/exceptions`, `/quotes` smoke checks.
- Phase 13 repo-side staging prep added `check:staging-prep`, `test:staging-prep`, synthetic import plan dry-run, and Cockpit Staging Pilot Readiness UI; verified by `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, `npm run check:staging-prep`, and local `/` smoke.
- Fresh staging Supabase creation was owner-approved and attempted on 2026-05-11, but Supabase blocked creation because the organization has reached its active free project limit; generated temporary DB password material was removed from Keychain after the failed attempt.
- Owner provided a new GitHub/Supabase setup with non-PM Supabase project ref `mgdsvapgltzwhsioccqd`; local ignored env config verifies as `staging_ready` with `npm run check:staging-prep`.
- Supabase MCP server was added and OAuth login completed for project ref `mgdsvapgltzwhsioccqd`; active Codex tool session now exposes Supabase MCP tools.
- Staging Supabase migrations `0001_fulfillment_v1_core` and `0002_staging_schema_hardening` were applied to the owner-provided non-PM project.
- Staging public schema surface was verified with read-only zero-row selects; no PII rows were read.
- Synthetic pilot fixture was imported into staging with 2 synthetic orders, 2 synthetic backers, 1 built-in exclusion, 2 accepted quotes, 2 accepted payment events, and 2 ready handoffs.
- Local Git branch `codex/phase-13-staging` was pushed and draft PR #1 was opened: https://github.com/calinfi-fulfillment/calinfi-fulfillment/pull/1
- Vercel account discovery found only existing `calinfi-pledge-manager` and `calinfi-production-app` projects; Fulfillment deployment requires a new separate Vercel project.

## 13. Staging Pilot

- [x] Repo-side staging prep checklist eklendi. Verified by this Phase 13 subsection and no-secrets scan.
- [x] Staging env validator hazır. Verified by `npm run test:staging-prep` and `npm run check:staging-prep`.
- [x] Synthetic fixture import plan dry-run hazır. Verified by `npm run test:staging-prep`; 2 synthetic orders produce 2 preview export rows and 1 built-in exclusion.
- [x] Staging Pilot readiness UI hazır. Verified by local `/` smoke showing `staging-pilot-readiness`.
- [x] Provider/Stripe/export/live flags disabled kaldı. Verified by `npm run test:staging-prep`, `npm run test:safety`, and `npm test`.
- [x] Phase 13 repo-side regression geçti. Verified by `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, `npm run check:staging-prep`, and local `/` smoke.
- [x] Fresh Fulfillment staging Supabase public project verified. Verified by owner-provided non-PM project ref `mgdsvapgltzwhsioccqd` and `npm run check:staging-prep`.
- [x] Supabase MCP configured and authenticated. Verified by `codex mcp list` showing `supabase` with OAuth auth.
- [x] Supabase MCP tools visible in active Codex session. Verified by `tool_search` surfacing `mcp__supabase__` tools.
- [x] Staging schema migration applied / DDL-level verified. Verified by Supabase `list_migrations`, verbose `list_tables`, clean security advisor, and `npm run test:staging-schema-public`.
- [x] Staging schema public table surface verified. Verified by `npm run test:staging-schema-public` against non-PM project ref `mgdsvapgltzwhsioccqd` with read-only zero-row selects.
- [x] Synthetic fixtures import edildi. Verified by staging aggregate counts: 2 synthetic orders, 3 order lines, 1 built-in exclusion, 2 accepted quotes, 2 accepted payment events, and 2 ready handoffs.
- [x] Local Git branch/commit hazırlandı. Verified by local branch `codex/phase-13-staging` and local commit.
- [x] GitHub branch push / draft PR açıldı. Verified by draft PR #1: https://github.com/calinfi-fulfillment/calinfi-fulfillment/pull/1
- [x] Vercel staging setup checklist eklendi. Verified by `docs/runbooks/VERCEL_STAGING.md`.
- [ ] Fresh Fulfillment Vercel staging project linked. BLOCKED: current Vercel account has `calinfi-pledge-manager` and `calinfi-production-app`; Fulfillment must use a separate new project.
- [ ] Vercel preview env configured. BLOCKED: requires separate Fulfillment Vercel project and Preview env keys.
- [ ] Vercel preview smoke passed. BLOCKED: requires preview deployment URL.
- [ ] Stripe test mode doğrulandı. BLOCKED: repo defaults `STRIPE_MODE=test`, but real Stripe test account/env verification requires owner-approved setup.
- [ ] PM production read-only aggregate baseline alındı. BLOCKED: requires owner-approved production read-only aggregate check.
- [x] 1-2 allowlisted pilot senaryosu planlandı. Verified by `docs/runbooks/STAGING_PILOT.md` and `npm run test:staging-launch-gates`.
- [ ] Sınır Bekçisi pre-pilot audit geçti. BLOCKED: formal pre-pilot audit requires staging env and owner-approved baseline context.

## 14. Launch Readiness

- [ ] Production env checklist tamam. BLOCKED: checklist prepared at `docs/runbooks/LAUNCH_READINESS.md`, but production env is not configured or approved.
- [x] Rollback/flag-off runbook hazır. Verified by `docs/runbooks/ROLLBACK_FLAGS.md` and `npm run test:staging-launch-gates`.
- [x] Backup/snapshot procedure hazır. Verified by `docs/runbooks/BACKUP_SNAPSHOT.md` and `npm run test:staging-launch-gates`.
- [x] No live provider/export action açık onay olmadan disabled. Verified by `.env.example`, `npm run test:live-flags`, and `npm run test:handoff`.
- [ ] Final Sınır Bekçisi boundary audit geçti. BLOCKED: requires staging/pilot evidence and owner go/no-go context.
- [ ] Owner go/no-go kararı alındı. BLOCKED: explicit owner launch decision required.

## Audit Gates

Sınır Bekçisi veya eşdeğer boundary audit aşağıdaki noktalarda çalıştırılmalı:

- [x] PM intake endpoint'i tamamlandığında. Verified by `npm run test:intake`, `npm run test:built-ins`, and signed route guard.
- [x] Quote/payment contract tamamlandığında. Verified by `npm run test:payment-contract` and `npm run test:payment-lock`.
- [ ] Stripe test-mode pilot öncesinde. BLOCKED: real Stripe test env not connected.
- [x] Handoff/export flow tamamlandığında. Verified by `npm run test:handoff`; no export file or partner API was executed.
- [x] Local dry-run boundary audit tamamlandığında. Verified by `docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md`, `npm test`, and `npm run check:preflight`.
- [ ] Staging pilot öncesinde. BLOCKED: fresh staging Supabase and PM read-only baseline required.
- [ ] Production go/no-go öncesinde. BLOCKED: staging pilot, final audit, and owner decision required.

## Completion Rule

Nihai uygulama hazır sayılması için Phase 0-14 tamamlanmış, tüm regression'lar geçmiş, PM canlı Phase 1 akışı bozulmamış, Fulfillment PM Supabase'e bağlanmamış ve owner go/no-go onayı alınmış olmalı.
