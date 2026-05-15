# ODUN Fulfillment V1 Project Checklist

Last updated: 2026-05-15

## Kullanım Kuralı

Bu dosya ODUN Fulfillment V1 için canonical proje checklist'idir. Her implementation turunun sonunda:

- Tamamlanan maddeler `[x]` yapılır.
- Blokaj varsa aynı satıra `BLOCKED: ...` notu eklenir.
- Hiçbir madde test, build, script, static inspection veya açık verification kanıtı olmadan tamamlandı sayılmaz.
- Live Supabase, Stripe, provider API, export, deploy veya migration aksiyonları owner onayı olmadan yapılmaz.
- Secrets, tokens, OTP, raw auth links veya PII-heavy örnekler bu repo/dokümanlara yazılmaz.

## Final Completion Plan

Bu bölüm projenin bitmesi için kalan canonical planıdır. Phase 0-28 yerel/staging ürün yüzeyi ve güvenlik hazırlığı olarak tamamlanmış kabul edilir; kalan işler canlıya geçiş kapılarıdır.

### A. Repo / PR Paketleme

- [x] Son local değişiklikler commitlendi. Verified by package commit on `codex/phase-13-staging` after full local regression.
- [x] Branch `codex/phase-13-staging` PR #1'e push edildi. Verified by `git push -u origin codex/phase-13-staging`.
- [x] PR #1 açıklaması güncel final scope, verification, blocked live gates ve no-live-action notlarıyla yenilendi. Verified by `gh pr edit 1`.
- [x] Final regression paketi PR üzerinde/local equivalent olarak geçti. Verified by 2026-05-13 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and `npm run check:completion-readiness`. Note: Vercel Git integration is now confirmed on the new account; production env/custom domain rollout remains a separate launch gate.

### B. Staging Pilot Gate

- [x] Vercel Git integration confirmed. Verified by `docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json`; new Vercel account GitHub import deployed `main` commit `816fb0e` to `https://calinfi-fulfillment-5idm.vercel.app` and public smoke returned 200 for `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports`.
- [x] Protected Vercel preview final smoke passed for `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, `/reports`. Verified on 2026-05-15 by Vercel preview deployment `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH` and `docs/evidence/VERCEL_PROTECTED_PREVIEW_SMOKE_2026-05-15.json`; direct anonymous access remains HTTP 401.
- [x] PM production read-only aggregate baseline alındı. Verified by `docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json`; aggregate/count only, no raw PII rows, no sensitive values, and no service keys printed or stored.
- [x] Stripe test mode gerçek env doğrulandı. Verified on 2026-05-14 by CLI login, webhook secret, publishable key, app-specific `rk_test_` restricted key, no-charge test Checkout Session, and app restricted-key Checkout smoke; persisted Checkout flag remains disabled.
- [x] Easyship sandbox `/rates` smoke geçti. Verified on 2026-05-14 with owner-provided sandbox token in ignored local env: `/2024-09/rates` returned HTTP 200 with 4 rates; shipment, label, export, and tracking remained disabled.
- [x] SFC read-only smoke geçti. Verified on 2026-05-14 with owner-provided read-only credentials via local command env: `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and `getRates` returned SOAP responses without faults, credential echo, WSDL document response, or mutation.
- [x] Sınır Bekçisi pre-pilot audit geçti. Verified by owner-approved SFC certificate review evidence, `docs/audits/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT.md`, and `npm run test:pre-pilot-boundary-audit` returning `okForPrePilot=true`.
- [x] 1-2 allowlisted staging pilot order run completed. Verified by `docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json`, `npm run check:staging-prep`, `npm run test:pilot-dry-run`, and `npm run test:staging-pilot-run`; no live provider/payment/label/export mutation was run.

### C. Production Launch Gate

- [ ] Production environment configured. BLOCKED: production Supabase/env/Vercel/custom domain/secrets not configured or approved.
- [ ] Production flags reviewed and only approved flags enabled. BLOCKED: requires owner launch scope; live provider/export/payment flags remain default `false`.
- [ ] Backup/snapshot completed immediately before launch. BLOCKED: launch timing and target systems required.
- [ ] Rollback/flag-off drill confirmed for production. BLOCKED: production env required.
- [ ] Final Sınır Bekçisi boundary audit geçti. BLOCKED: requires production env review and final go/no-go context.
- [ ] Owner go/no-go kararı alındı. BLOCKED: explicit owner launch decision required.
- [ ] Production smoke passed after launch. BLOCKED: requires owner go/no-go and approved deployment.

### D. Final Acceptance Criteria

- [ ] All `Final Completion Plan` items are complete or explicitly deferred by owner. BLOCKED: production launch gates remain open; no owner deferral/go-live decision has been recorded.
- [x] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and `npm run test:ui` pass on the final package. Verified by 2026-05-15 local regression including `test:pre-pilot-boundary-audit`, `test:checklist`, and synthetic UI E2E.
- [x] Fulfillment remains disconnected from PM Supabase except approved, read-only PM aggregate checks. Verified by `npm run test:pm-supabase-guard` and `npm run check:completion-readiness`.
- [x] No raw backer PII, secrets, OTPs, auth links, service-role keys, Stripe live keys, Easyship tokens, or SFC credentials are committed. Verified by `npm run test:no-secrets`.
- [x] Live label, shipment, tracking, export, partner push, SFC mutation, and Stripe live payment are impossible unless explicitly approved flags/credentials are present. Verified by `npm run test:live-flags`, `npm run test:sfc-network`, `npm run test:easyship-adapter`, and `npm run check:completion-readiness`.
- [x] Operator docs are complete: Markdown guide, PDF guide, staging runbooks, rollback runbook, backup runbook, SFC/Easyship network plan. Verified by `npm run check:completion-readiness`.

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

- [x] App shell ve nav hazır: Cockpit, Shipping, Production & Stock, Orders, Quotes, Payments, Handoffs, Exceptions, Reports. Verified by `npm run test:ops-ui`, `npm run build`, and local route smoke.
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
- [x] `test:stripe-contract` geçti. Verified by focused regression and `npm test`.
- [x] `test:payment-lock` geçti. Verified by `npm test`.
- [x] `test:provider-adapter` geçti. Verified by focused regression and `npm test`.
- [x] `test:provider-mock-handoff` geçti. Verified by focused regression and `npm test`.
- [x] `test:ops-ui` geçti. Verified by `npm test`.
- [x] `test:handoff` geçti. Verified by `npm test`.
- [x] `test:reports` geçti. Verified by `npm test`.
- [x] `test:staging-launch-gates` geçti. Verified by `npm test`.
- [x] `test:staging-prep` geçti. Verified by `npm test`.
- [x] `test:preflight` geçti. Verified by `npm test`.
- [x] `test:pilot-dry-run` geçti. Verified by `npm test`.
- [x] `test:vercel-bypass-mode` geçti. Verified by focused regression and `npm test`.
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
- Separate Vercel project `odun-fulfillment-v1` / `prj_gxorHDOfctSfP6KcAo6stLzFIkyf` was verified; no custom production domain is attached.
- Local workspace was linked to the separate Vercel project `odun-fulfillment-v1`; `.vercel/` is ignored and remains uncommitted.
- Vercel project framework was corrected to Next.js after an initial non-serving deployment failed with the default `Other` preset.
- Vercel Preview env was configured with the non-PM Supabase public env and all live/provider/export/Stripe Checkout flags disabled; no service-role key or live/provider secret was added.
- Manual protected Vercel Preview deployment `dpl_7B3Cbxp5sJoxAgjxRRrSVigCxqHV` is ready at https://odun-fulfillment-v1-qpqnp1r8q-hello-75539063s-projects.vercel.app.
- Protected preview smoke passed for `/api/health`, `/`, and `/reports`; direct anonymous fetches return HTTP 401 because Deployment Protection is enabled.
- Vercel Git integration was originally blocked on the old account, but the new Vercel account GitHub import is now confirmed for `calinfi-fulfillment/calinfi-fulfillment`.
- Local + Supabase staging continuation remains documented in `docs/runbooks/LOCAL_STAGING_WITHOUT_VERCEL.md` as a fallback mode.
- Stripe test contract validation and synthetic webhook normalization were added without creating Stripe Checkout sessions; verified by `npm run test:stripe-contract`.
- Provider-agnostic mock adapter was added for rates, handoff, tracking, and health checks; verified by `npm run test:provider-adapter` and `npm run test:provider-mock-handoff`.
- Cockpit, Payments, Quotes, and Handoffs now show local-staging/Vercel-bypass, test webhook, mock rate, and mock handoff readiness surfaces; verified by `npm run test:ops-ui`.
- Full Vercel-free continuation regression passed: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:staging-prep`, and local smoke on `/`, `/quotes`, `/payments`, `/handoffs`, and `/api/health`.
- Stripe test Checkout route, restricted test-key guard, Checkout metadata/idempotency builder, and Payments readiness panel were added without using or storing pasted secrets; verified by `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:no-secrets`.
- Stripe Test Pilot checklist, synthetic Checkout-to-webhook pilot, and raw Stripe webhook signature endpoint were added without live Stripe calls; verified by focused `test:stripe-webhook`, `test:stripe-test-pilot`, `typecheck`, `lint`, and `test:no-secrets`.
- Easyship API dashboard was inspected without storing the visible token, and sandbox-safe request planning was added for rates/shipments with live label/export disabled; verified by `npm run test:easyship-adapter`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:no-secrets`.
- Takeover continuity fix added the missing `scripts/sfc-network-regression.ts` and wired Ops UI coverage for the SFC + Easyship network panel; verified by `npm run test:sfc-network`, `npm run test:ops-ui`, `npm run test:easyship-adapter`, `npm run test:no-secrets`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`. No Easyship/SFC external request, label, shipment, export, tracking, deploy, migration, or live mutation was run.
- UX/UI specialist polish pass tightened the app shell, navigation, table density, shipping console hierarchy, safety banner prominence, and keyboard row selection; verified by `npm run test:ops-ui`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and local `/shipping` plus `/quotes` HTTP 200 smoke. No live provider call, label, export, tracking, migration, deploy, secret, or PII example was added.
- SFC read-only smoke planning pass added a redacted local plan helper, `smoke:sfc-read-only-plan`, and an owner-scope runbook; verified by `npm run test:sfc-network`, `npm run typecheck`, `npm run lint`, and `npm run test:no-secrets`. No SFC external request, mutation, ASN, order creation, export, label, tracking, deploy, migration, secret, or PII example was added.
- Non-mutation provider smoke scope was accepted on 2026-05-13. SFC read-only API execution command `smoke:sfc-read-only-api` now posts to the real SOAP service endpoint for `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and read-only rate lookup only; 2026-05-14 read-only smoke passed without faults or credential echo. Easyship sandbox `/rates` also passed on 2026-05-14 after aligning the 2024-09 payload schema.
- Completion readiness automation added `check:completion-readiness` / `test:completion-readiness`; local package readiness is `true`, production launch readiness is `false` with explicit blockers for production go/no-go. Verified by `npm run check:completion-readiness`, `npm run typecheck`, and `npm run lint`.
- SFC negotiation brief pass added the owner-facing SFC requirements runbook, reusable agreement brief model, and Kargo Merkezi agreement panel so SFC can provide the exact read-only credentials/warehouse/method-code inputs needed to finish today. Verified by `npm run test:sfc-network`, `npm run test:ops-ui`, and `npm run test:staging-launch-gates`.
- SFC API 3.0 PDF and PHP sample alignment pass updated SKU stock smoke to `getStockBySKU`, posts stock warehouse ID at request level, and adds `getRates` as an allowed read-only estimate action. No credential value was copied into repo docs or source.
- SFC read-only env doctor was added so the real API smoke can be checked without printing credentials. It validates mode, WSDL host, SOAP service endpoint, credential presence/length only, read-only/mutation flags, warehouse ID, stock SKU, rate action, and certificate rotation/review confirmation.
- SFC certificate review packet added at `docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json`; it is redacted and owner-approved. Verified by `npm run test:sfc-certificate-review`.
- 2026-05-14 continuation packaging pass verified the Stripe/Easyship/SFC smoke evidence through completion readiness and reran `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:no-secrets`. No external provider request, deploy, migration, label, shipment, export, tracking, payment capture, SFC mutation, secret value, or PII example was added.
- 2026-05-15 checklist closure pass added `test:pre-pilot-boundary-audit` and `test:checklist`, recorded `docs/audits/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT.md`, and updated stale Stripe/Easyship/SFC audit gates. Local code-boundary readiness, PM aggregate baseline, Vercel Git evidence, and SFC certificate review are true; pilot execution approval and production gates remain blocked.
- 2026-05-15 protected preview smoke passed on Vercel deployment `dpl_59MCgMUs4zHAKVbLkv7tcsQpiYYH`: `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports` returned HTTP 200 through `vercel curl`; anonymous direct access returned HTTP 401; health reported PM Supabase not blocked, live flags off, public Supabase configured, and service-role Supabase not configured. No production deploy, alias, live mutation, provider mutation, payment capture, label, export, or tracking action was run.
- 2026-05-15 synthetic UI E2E pass added `test:ui` with Chrome-driven coverage for `/`, `/shipping`, `/orders`, `/quotes`, `/payments`, `/handoffs`, `/exceptions`, and `/reports`; fixed order route sync, negative manual DDP input handling, table/form accessibility label collisions, responsive grid overflow, and missing app icon resource. Verified by `npm run test:ui`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:no-secrets`, and `npm test`.
- 2026-05-15 new Vercel account GitHub import confirmed main deployment `dpl_FadPJzuqvjNnFMiFaQi6iBqmw9oW` on project `calinfi-fulfillment-5idm`; public smoke for `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports` returned HTTP 200 with live mutation flags off, no service-role Supabase configured, and no custom production domain attached.
- 2026-05-15 production/stock module pass added a Fulfillment-owned `/inventory` tab for produced, on-hand, reserved, available, demand, shortage, batch, total amount delta, and local fulfillment stock-feed visibility. Added inventory domain enums, static migration `0003_inventory_module.sql`, synthetic fixture calculations, `test:inventory`, and UI E2E coverage. No live migration, staging mutation, provider mutation, label, export, PM production read, PM mutation, or SFC stock write was run.
- 2026-05-15 allowlisted staging pilot closure pass recorded `docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json` and added `test:staging-pilot-run`; the two synthetic staging pilot orders are covered by prior staging aggregate import evidence plus the current synthetic dry-run, with provider/payment/label/export mutations still disabled.
- 2026-05-15 staging inventory schema pass applied `0003_inventory_module.sql` only to non-PM staging project `mgdsvapgltzwhsioccqd`, recorded `docs/evidence/STAGING_INVENTORY_SCHEMA_2026-05-15.json`, and expanded `npm run test:staging-schema-public` to cover `fulfillment_stock_feed`. No production migration, real stock seed/import, PM read/write, provider mutation, label, export, tracking, payment capture, or raw PII access was run.

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
- [x] Fresh Fulfillment Vercel staging project verified. Verified by Vercel project `odun-fulfillment-v1` / `prj_gxorHDOfctSfP6KcAo6stLzFIkyf`.
- [x] Vercel Git integration next-action checklist eklendi. Verified by `docs/runbooks/VERCEL_STAGING.md`.
- [x] Vercel Git integration confirmed. Verified by new Vercel account GitHub import evidence `docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json`.
- [x] Vercel preview env configured. Verified by Preview env setup on project `odun-fulfillment-v1`; live/provider/export/Stripe Checkout flags remain disabled and no service-role key was added.
- [x] Vercel preview smoke passed. Verified by protected preview smoke for `/api/health`, `/`, and `/reports` on deployment `dpl_7B3Cbxp5sJoxAgjxRRrSVigCxqHV`.
- [x] Vercel'siz local/staging devam checklist'i eklendi. Verified by `docs/runbooks/LOCAL_STAGING_WITHOUT_VERCEL.md` and `npm run test:vercel-bypass-mode`.
- [x] Local/staging dev mode confirmed. Verified by `npm run test:vercel-bypass-mode`, `npm run check:staging-prep`, and non-PM Supabase staging config.
- [x] Supabase staging checks passed. Verified by `npm run check:staging-prep` and prior `npm run test:staging-schema-public`.
- [x] Stripe test contract prep tamamlandı. Verified by `npm run test:stripe-contract`; no Checkout session is created and live mode is blocked.
- [x] Stripe test Checkout route eklendi. Verified by `npm run build`; route listed as `/api/stripe/checkout`.
- [x] Restricted `rk_test` key guard eklendi. Verified by `npm run test:stripe-checkout`.
- [x] Checkout Session metadata/idempotency builder test edildi. Verified by `npm run test:stripe-checkout`.
- [x] Payments UI Stripe Checkout readiness paneli eklendi. Verified by `npm run test:ops-ui` and `npm run build`.
- [x] `test:stripe-checkout`, `test:no-secrets`, `typecheck`, `lint`, `build` geçti. Verified by `npm test`, `npm run test:no-secrets`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Stripe Test Pilot checklist eklendi. Verified by this Phase 13 subsection.
- [x] Synthetic Stripe Checkout pilot zinciri tamamlandı. Verified by `npm run test:stripe-test-pilot`; external calls are mocked.
- [x] Stripe raw webhook signature endpoint eklendi. Verified by `npm run test:stripe-webhook` and build route listing.
- [x] Stripe webhook duplicate/mismatch/idempotency regression geçti. Verified by `npm run test:stripe-webhook`.
- [x] Stripe Test Pilot değişiklikleri PR #1'e push edildi. Verified by push of commit `0b134d0` to `codex/phase-13-staging`.
- [x] Provider adapter prep tamamlandı. Verified by `npm run test:provider-adapter` and `npm run test:provider-mock-handoff`; external actions remain `none`.
- [x] PM production aggregate baseline evidence eklendi. Verified by `docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json`; PM production checks stayed aggregate/count-only and no raw PII rows were printed.
- [x] Stripe test mode doğrulandı. Verified by `smoke:stripe-restricted-key-checkout`; app-specific `rk_test_` created a test Checkout Session with `livemode=false`, while persisted Checkout flag remains disabled.
- [x] PM production read-only aggregate baseline alındı. Verified by `docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json`; aggregate counts reconcile PM backer and pledge totals, fulfillment intake links remain zero, and PM->Fulfillment sync remains disabled.
- [x] 1-2 allowlisted pilot senaryosu planlandı. Verified by `docs/runbooks/STAGING_PILOT.md` and `npm run test:staging-launch-gates`.
- [x] Sınır Bekçisi pre-pilot audit geçti. Verified by `npm run test:pre-pilot-boundary-audit` returning `okForPrePilot=true` after owner-approved SFC certificate review evidence.
- [x] 1-2 allowlisted staging pilot order run completed. Verified by `docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json`, `npm run check:staging-prep`, `npm run test:pilot-dry-run`, and `npm run test:staging-pilot-run`; no live provider/payment/label/export mutation was run.

## 14. Launch Readiness

- [ ] Production env checklist tamam. BLOCKED: checklist prepared at `docs/runbooks/LAUNCH_READINESS.md`, but production env is not configured or approved.
- [x] Rollback/flag-off runbook hazır. Verified by `docs/runbooks/ROLLBACK_FLAGS.md` and `npm run test:staging-launch-gates`.
- [x] Backup/snapshot procedure hazır. Verified by `docs/runbooks/BACKUP_SNAPSHOT.md` and `npm run test:staging-launch-gates`.
- [x] No live provider/export action açık onay olmadan disabled. Verified by `.env.example`, `npm run test:live-flags`, and `npm run test:handoff`.
- [ ] Final Sınır Bekçisi boundary audit geçti. BLOCKED: requires staging/pilot evidence and owner go/no-go context.
- [ ] Owner go/no-go kararı alındı. BLOCKED: explicit owner launch decision required.

## 15. Easyship Provider Integration Prep

- [x] Easyship dashboard/API connection inspected without storing token. Verified by Chrome inspection only; token value was not copied into repo/docs.
- [x] Easyship env guard eklendi. Verified by `.env.example` and `createEasyshipReadiness`.
- [x] Easyship sandbox readiness check eklendi. Verified by `npm run test:easyship-adapter`.
- [x] Easyship rates request planner hazır. Verified by `buildEasyshipRatesRequestPlan` and `npm run test:easyship-adapter`.
- [x] Easyship shipment request planner future-gated bırakıldı. Verified by `buildEasyshipShipmentRequestPlan`; external actions remain `none`.
- [x] Easyship UI readiness surface eklendi. Verified by `npm run test:ops-ui`.
- [x] `test:easyship-adapter`, `test:ops-ui`, `test:no-secrets`, `typecheck`, `lint`, `build` geçti. Verified by focused checks and `npm test`.
- [x] Live Easyship label/shipment/export disabled kaldı. Verified by `externalActions: none`, disabled env defaults, and `npm run test:easyship-adapter`.

## 16. Easyship Sandbox Rate Smoke

- [x] `.env.local` Easyship sandbox env user-side configured. Verified by smoke readiness reaching the Easyship sandbox request step without printing token values.
- [x] Sandbox token was not printed or committed. Verified by redacted smoke output and `npm run test:no-secrets`.
- [x] Easyship sandbox env doctor eklendi. Verified by `check:easyship-sandbox-env`; it reports token presence/length only and performs no external API call.
- [x] `smoke:easyship-sandbox-rates` script eklendi. Verified by 2026-05-14 sandbox HTTP 200 smoke with redacted token output.
- [x] Sandbox `/rates` smoke geçti. Verified on 2026-05-14: Easyship sandbox endpoint returned HTTP 200 with 4 rates for the synthetic non-PII ODUN payload.
- [x] Shipment/label/export/tracking disabled kaldı. Verified by smoke script forced guards and no shipment/label/tracking endpoint calls.
- [x] `test:no-secrets`, `typecheck`, `lint`, `build` geçti. Verified by `npm run test:no-secrets`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`.

## 17. Turkish Simple Ops UI

- [x] Navigation, page titles, and page subtitles Turkish-first oldu. Verified by `npm run test:ops-ui`.
- [x] Each page has a four-step plain-language guide. Verified by `AppShell` `page-guide` and `npm run test:ops-ui`.
- [x] Table controls, column labels, status badges, and selected-row inspector are Turkish and operator-friendly. Verified by `src/lib/ops-ui/labels.ts`, `DataTable`, and `npm run test:ops-ui`.
- [x] Orders, Quotes, Payments, Handoffs, Exceptions, Reports workbenches use plain Turkish action labels. Verified by focused source regression and `npm run test:ops-ui`.
- [x] Safety/live-action disabled messaging stayed visible. Verified by disabled live buttons and safety strip source inspection.
- [x] `test:ops-ui`, `typecheck`, `lint`, `build`, `test:no-secrets` geçti. Verified by focused checks and `npm test`.
- [x] Local smoke for `/`, `/inventory`, `/orders`, `/quotes`, `/payments`, `/handoffs`, `/exceptions`, `/reports` passed. Verified by local HTTP 200 smoke.

## 18. Easyship-Style Shipping Console

- [x] Easyship'in birebir marka/UI kopyası yerine ODUN'a özel kargo merkezi yaklaşımı uygulandı. Verified by `ShippingConsole` copy and source inspection.
- [x] `/shipping` route eklendi ve navigation içine bağlandı. Verified by `npm run test:ops-ui` and local `/shipping` smoke.
- [x] Ana ekrana Easyship tarzı kargo merkezi paneli eklendi. Verified by `ShippingConsole` on `/` and local `/` smoke.
- [x] Gönderi hazırlık adımları hazır: sipariş, paket, fiyat, etiket. Verified by `ship-stepper` UI and `npm run test:ops-ui`.
- [x] Kargo fiyat kartları ve güvenli seçili fiyat önizlemesi hazır. Verified by rate-card UI and local-only event state.
- [x] Canlı etiket/gönderi/takip aksiyonları disabled kaldı. Verified by disabled live label button and safety note.
- [x] `test:ops-ui`, `typecheck`, `lint`, `build`, `test:no-secrets`, `npm test` geçti. Verified by focused checks and full regression.
- [x] Local smoke for `/`, `/shipping`, `/quotes`, `/handoffs` passed. Verified by HTTP 200 smoke.

## 19. Stitch Concept Redesign Pass

- [x] Whole-app Stitch prompt hazırlandı. Verified by `docs/design/STITCH_APP_PROMPT.md`.
- [x] Prompt ODUN/PM/Fulfillment sınırlarını ve canlı aksiyon güvenliklerini açık anlatıyor. Verified by prompt source and `npm run test:ops-ui`.
- [x] Kargo Merkezi layout taşma/üst üste binme riskine karşı yeniden düzenlendi. Verified by responsive CSS auto-fit/flex wrap pass.
- [x] Kontrol Paneli, Kargo Merkezi'ni tam panel yerine sade shortcut olarak gösteriyor. Verified by `shipping-shortcut`.
- [x] Responsive shipping grids auto-fit/flex wrap davranışına geçti. Verified by `.ship-overview`, `.ship-form-grid`, `.rate-board`, `.ship-hero-actions`.
- [x] `test:ops-ui`, `typecheck`, `lint`, `build`, `test:no-secrets`, `npm test` geçti. Verified by focused and full regression.
- [x] Local smoke for `/`, `/shipping`, `/quotes`, `/handoffs` passed. Verified by HTTP 200 smoke.

## 20. Stitch Import Application Pass

- [x] Stitch zip içeriği incelendi. Verified by `/Users/ersin/Downloads/stitch_untitled_minimalist_project.zip` extraction review.
- [x] Stitch design tokens app shell'e uyarlandı: light surface, teal primary, Inter stack, 8px radius. Verified by `src/app/globals.css`.
- [x] Sidebar Stitch konseptine göre açık renk güvenli operasyon menüsüne dönüştürüldü. Verified by `src/components/app-shell.tsx` and `src/app/globals.css`.
- [x] Kargo Merkezi safety banner, geniş spacing ve kart padding düzeniyle yeniden uygulandı. Verified by `src/components/shipping-console.tsx`.
- [x] Ana grid ve Kargo Merkezi responsive davranışı taşma/üst üste binme riskine karşı doğrulandı. Verified by responsive CSS and local smoke.
- [x] `test:ops-ui`, `typecheck`, `lint`, `build`, `test:no-secrets`, `npm test` geçti. Verified after Stitch import pass.
- [x] Local smoke for `/`, `/shipping`, `/quotes`, `/handoffs` passed. Verified by HTTP 200 smoke on `localhost:3105`.

## 21. SFC China Hub + Easyship Regional Network Plan

- [x] SFC China Hub canonical role documented. Verified by `docs/architecture/SFC_EASYSHIP_NETWORK_PLAN.md`.
- [x] Easyship US/EU regional last-mile role documented. Verified by `docs/architecture/SFC_EASYSHIP_NETWORK_PLAN.md`.
- [x] Asia direct DDP route family planned as SFC-owned direct shipment. Verified by route family table.
- [x] US bulk freight + Easyship last-mile route family planned. Verified by route family table.
- [x] EU bulk freight + Easyship last-mile route family planned. Verified by route family table.
- [x] Bulk freight landed-cost allocation model planned. Verified by cost model section.
- [x] Backer PII provider boundary documented. Verified by safety rules; US/EU bulk freight should not send final backer addresses to SFC.
- [x] SFC/Easyship implementation phase checklist added. Verified by implementation phases section.
- [x] SFC read-only SOAP planners implemented. Verified by `src/lib/sfc/request.ts` and `npm run test:sfc-network`.
- [x] SFC product/customs readiness mapping implemented. Verified by `src/lib/sfc/product.ts` and `npm run test:sfc-network`.
- [x] Easyship US/EU regional quote planner implemented. Verified by `src/lib/easyship/regional.ts` and `npm run test:sfc-network`.
- [x] Bulk freight landed-cost preview implemented. Verified by `src/lib/network-plan/landed-cost.ts` and `npm run test:sfc-network`.
- [x] Bulk freight batch manifest planner implemented. Verified by `src/lib/network-plan/freight-batch.ts` and `npm run test:sfc-network`.
- [x] SFC China Hub / Product Customs / Freight Batches / Easyship Last-Mile UI implemented. Verified by `src/components/network-readiness.tsx`, `/shipping`, `/quotes`, and `npm run test:ops-ui`.
- [x] SFC mutation previews stay redacted and disabled. Verified by `buildSfcCreateOrderPreviewPlan`, `buildSfcCreateAsnPreviewPlan`, and `npm run test:sfc-network`.
- [x] Product/customs sync preview stays local-only and PII-free. Verified by `externalActions: none`, synthetic SFC product sync regression, and `npm run test:no-secrets`.
- [x] Freight batch manifest stays PII-free. Verified by `containsBackerPii: false`, source-order/SKU-only manifest regression, and `npm run test:sfc-network`.
- [x] Local-only network phase checks passed. Verified by `npm run test:sfc-network`, `npm run test:ops-ui`, `npm run typecheck`, and `npm run lint`.
- [x] Real SFC/Easyship API smoke passed. Verified by SFC read-only SOAP smoke/product visibility and Easyship sandbox `/rates` HTTP 200 evidence; no shipment, label, export, tracking, order, ASN, or product mutation was run.

## 22. UX/UI Specialist Ops Polish

- [x] UX/UI worker review completed. Verified by applied patch from worker `Wegener` and maintainer review.
- [x] App shell/nav density improved for operations scanning. Verified by `src/components/app-shell.tsx`, `src/app/globals.css`, and `npm run test:ops-ui`.
- [x] Shipping console safety state made more prominent. Verified by `ShippingConsole` safety banner and local `/shipping` HTTP 200 smoke.
- [x] Interactive table accessibility improved. Verified by `DataTable` keyboard row selection, `aria-live` status line, and `npm run test:ops-ui`.
- [x] Filtered table selection no longer points at hidden rows. Verified by `src/components/data-table.tsx` source review and `npm run test:ops-ui`.
- [x] Live/provider/label/export/payment disabled messaging remained visible. Verified by source inspection and `npm run test:ops-ui`.
- [x] UX/UI polish checks passed. Verified by `npm run test:ops-ui`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:no-secrets`.
- [x] Synthetic UI E2E tarayıcı testi eklendi. Verified by `npm run test:ui` covering fake-data flows across all core ops routes, desktop/mobile overflow, console errors, local-only actions, and disabled live controls.
- [x] Local smoke for `/shipping` and `/quotes` passed. Verified by HTTP 200 smoke on the preview server.

## 23. SFC Read-only Smoke Planning

- [x] SFC read-only smoke runbook eklendi. Verified by `docs/runbooks/SFC_READ_ONLY_SMOKE.md`.
- [x] SFC read-only smoke plan helper eklendi. Verified by `createSfcReadOnlySmokePlan` and `npm run test:sfc-network`.
- [x] Smoke plan sadece read-only SOAP aksiyonları hazırlar. Verified by `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and read-only rate regression.
- [x] Smoke plan credential değerlerini redacted tutar. Verified by synthetic credential regression and `npm run test:no-secrets`.
- [x] Local planning command eklendi. Verified by `smoke:sfc-read-only-plan` script in `package.json`.
- [x] Kargo Merkezi UI smoke plan durumunu gösterir. Verified by `NetworkReadiness` `sfc-read-only-smoke-plan` card and `npm run test:ops-ui`.
- [x] SFC mutation flag guardı smoke plan içinde bloklu kaldı. Verified by `createSfcReadiness` regression.
- [x] SFC read-only API execution command eklendi. Verified by `smoke:sfc-read-only-api`, `hydrateSfcRequestBodyForExecution`, response summary redaction regression, and `npm run test:sfc-network`.
- [x] SFC read-only API output raw SOAP body basmaz. Verified by response summary fields: status, content type, byte size, SHA-256, SOAP fault flag, and credential echo flag only.
- [x] SFC read-only env doctor eklendi. Verified by `check:sfc-read-only-env` script and no credential value output.
- [x] SFC certificate review packet eklendi. Verified by `docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json` and `npm run test:sfc-certificate-review`; status is `approved`.
- [x] Real SFC read-only smoke passed. Verified on 2026-05-14 by `smoke:sfc-read-only-api` against the SOAP service endpoint; all four read-only actions returned SOAP responses with no credential echo.

## 24. Completion Readiness Evidence

- [x] Completion readiness checker eklendi. Verified by `scripts/completion-readiness.ts` and `check:completion-readiness`.
- [x] Completion readiness checker `npm test` içine bağlandı. Verified by `test:completion-readiness` in `package.json`.
- [x] Operator doküman seti varlığı otomatik doğrulanıyor. Verified by 19 required docs plus 8 guide screenshots in `npm run check:completion-readiness`.
- [x] PM Supabase boundary otomatik doğrulanıyor. Verified by `pm-supabase-boundary` check in `npm run check:completion-readiness`.
- [x] Live mutation/provider safety flags otomatik doğrulanıyor. Verified by `live-mutation-flags-disabled`, `easyship-non-mutation-flags`, `sfc-mutations-disabled`, and `sfc-read-only-plan-safe` checks.
- [x] Local package readiness true. Verified by `npm run check:completion-readiness` returning `okForLocalPackage: true`.
- [ ] Production launch readiness true. BLOCKED: `npm run check:completion-readiness` reports `okForProductionLaunch: false` until production gates and owner go/no-go are complete.

## 25. SFC Same-day Agreement Brief

- [x] SFC same-day negotiation brief eklendi. Verified by `docs/runbooks/SFC_NEGOTIATION_BRIEF.md`.
- [x] SFC'den istenecek read-only aksiyonlar tek yerde toplandı. Verified by `createSfcAgreementBrief` read-only action regression.
- [x] SFC credential, warehouse, stock, rate ve DDP method-code kabul kriterleri yazıldı. Verified by brief required item regression.
- [x] Mutation pilot sınırı ayrı tutuldu. Verified by `createOrder`, `createASN`, and product mutation boundary checks.
- [x] Kargo Merkezi içine SFC anlaşma paneli eklendi. Verified by `SfcAgreementBriefPanel` and `npm run test:ops-ui`.
- [x] SFC resmi kaynak linkleri dokümana eklendi. Verified by `docs/runbooks/SFC_NEGOTIATION_BRIEF.md`.
- [x] SFC read-only credential seti teslim alındı. Verified by owner-provided API user/token/key; values were not echoed or stored in repo.
- [x] SFC API certificate rotate/review confirmed. Verified by owner-approved `docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json`; credential values remain absent from repo/docs/log evidence.
- [ ] SFC warehouse ve DDP method-code detayları doğrulandı. BLOCKED: SFC must confirm canonical ODUN warehouse ID and approved Asia DDP shipping method code(s).

## 26. SFC API Sample Alignment

- [x] SFC API 3.0 PDF alanları incelendi. Verified by local PDF review for HeaderRequest, `getStockBySKU`, `getWarehouse`, `getShippingMethod`, `getRate`, `getRateByMode`, `getRates`, and `getStock`.
- [x] PHP stock sample ile planner hizalandı. Verified by `buildSfcStockPlan` using `getStockBySKU`, WSDL operation wrapper, and request-level warehouse ID.
- [x] PHP shipping fee estimate sample desteklendi. Verified by `buildSfcRatesEstimatePlan` using read-only `getRates`.
- [x] Real smoke öncesi env gate eklendi. Verified by `npm run check:sfc-read-only-env`.
- [x] SFC WSDL dokümanı ile gerçek SOAP service endpoint ayrıldı. Verified by `SFC_SERVICE_URL`, `npm run test:sfc-network`, and WSDL-document response guard.
- [x] Gerçek SFC read-only smoke çalıştı. Verified on 2026-05-14 by `smoke:sfc-read-only-api` for `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and `getRates`; no SOAP fault, credential echo, WSDL document response, or mutation.
- [x] SFC product visibility smoke eklendi. Verified by `smoke:sfc-product-visibility`; ODUN product upload check read all 34 SKUs by `getStockBySKU`, warehouse `1`, stock `0`, no SOAP fault or credential echo.

## 27. Checklist Closure & Pre-Pilot Boundary Audit

- [x] Pre-pilot boundary audit script eklendi. Verified by `npm run test:pre-pilot-boundary-audit`; it reports `okForCodeBoundary=true`, `okForPrePilot=true`, and no external actions.
- [x] Pre-pilot audit note eklendi. Verified by `docs/audits/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT.md`.
- [x] Checklist regression eklendi. Verified by `npm run test:checklist`; every remaining open item has an explicit `BLOCKED:` reason and obsolete Stripe/Easyship/SFC blockers are rejected.
- [x] SFC certificate review regression eklendi. Verified by `npm run test:sfc-certificate-review`; approved status requires owner approval, certificate-source review, redacted evidence, and no mutation approval.
- [x] Full test suite yeni audit/checklist kapılarını içeriyor. Verified by `npm test` script including `test:pre-pilot-boundary-audit`, `test:staging-pilot-run`, and `test:checklist`.
- [x] Stripe/Easyship/SFC evidence gates checklist içinde güncellendi. Verified by `npm run test:checklist`.
- [x] Protected Vercel preview smoke evidence eklendi. Verified by `docs/evidence/VERCEL_PROTECTED_PREVIEW_SMOKE_2026-05-15.json`, `npm run check:completion-readiness`, and `npm run test:pre-pilot-boundary-audit`.
- [x] Local code-boundary pre-pilot readiness true. Verified by `npm run test:pre-pilot-boundary-audit`; formal pre-pilot boundary pass is complete.

## 28. Production & Stock Module

- [x] Fulfillment-owned `/inventory` route eklendi. Verified by `src/app/inventory/page.tsx`, `OPS_NAV_ITEMS`, and `npm run test:ops-ui`.
- [x] Üretim/stok domain hesaplayıcısı eklendi: produced, received, on-hand, reserved, damaged, in-transit, safety stock, available, demand, reservable, shortage. Verified by `src/lib/inventory/index.ts` and `npm run test:inventory`.
- [x] Toplam tutar değişimi eklendi: original amount, current amount, amount delta. Verified by `npm run test:inventory` and `npm run test:ui`.
- [x] Built-in kutu içeriği fulfillment stok reservation feed'inden çıkarıldı. Verified by `npm run test:inventory`.
- [x] Fulfillment stok feed'i local-only ve external action `none` olarak kaldı. Verified by `buildFulfillmentStockFeed`, UI disabled live warehouse button, and `npm run test:inventory`.
- [x] Stok schema taslağı eklendi: `inventory_locations`, `inventory_batches`, `inventory_reservations`, and `fulfillment_stock_feed`. Verified by `supabase/migrations/0003_inventory_module.sql` and `npm run test:schema`.
- [x] Inventory staging schema drift kapandı. Verified by owner-approved `docs/evidence/STAGING_INVENTORY_SCHEMA_2026-05-15.json` and `npm run test:staging-schema-public`; production migration and stock seed/import remain separate gates.
- [x] UI E2E stok akışı eklendi. Verified by `npm run test:ui` covering `/inventory`, total amount delta, local SFC `getStockBySKU` planning, fulfillment feed preview, and disabled live warehouse mutation.
- [x] Güvenlik sınırı korundu: PM production verisi okunmadı/değişmedi, SFC/Easyship/3PL canlı stok yazımı veya export çalışmadı. Verified by `npm run test:no-secrets`, disabled controls, and implementation scope.

## Audit Gates

Sınır Bekçisi veya eşdeğer boundary audit aşağıdaki noktalarda çalıştırılmalı:

- [x] PM intake endpoint'i tamamlandığında. Verified by `npm run test:intake`, `npm run test:built-ins`, and signed route guard.
- [x] Quote/payment contract tamamlandığında. Verified by `npm run test:payment-contract` and `npm run test:payment-lock`.
- [x] Stripe test-mode pilot öncesinde. Verified by `docs/evidence/STRIPE_CLI_CHECKOUT_2026-05-14.json`, `npm run test:pre-pilot-boundary-audit`, and `npm run test:checklist`; persisted Checkout flag remains disabled.
- [x] Handoff/export flow tamamlandığında. Verified by `npm run test:handoff`; no export file or partner API was executed.
- [x] Local dry-run boundary audit tamamlandığında. Verified by `docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md`, `npm test`, and `npm run check:preflight`.
- [x] Staging pilot öncesinde. Verified by `npm run test:pre-pilot-boundary-audit` returning `okForPrePilot=true`; actual 1-2 allowlisted pilot order run is now recorded in `docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json`.
- [ ] Production go/no-go öncesinde. BLOCKED: final audit and owner decision required.

## Completion Rule

Nihai uygulama hazır sayılması için Phase 0-28 tamamlanmış, `Final Completion Plan` maddeleri tamamlanmış veya owner tarafından açıkça defer edilmiş, tüm regression'lar geçmiş, PM canlı Phase 1 akışı bozulmamış, Fulfillment PM Supabase'e bağlanmamış, canlı provider/payment/export/mutation sınırları owner onayı olmadan kapalı kalmış ve owner go/no-go onayı alınmış olmalı.
