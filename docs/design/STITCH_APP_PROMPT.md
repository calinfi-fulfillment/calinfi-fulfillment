# Stitch Prompt: ODUN Fulfillment V1 Concept UI

Design a complete Turkish-first web application concept for **ODUN Fulfillment V1**, a safe fulfillment operations panel for CALINFI / ODUN Kickstarter backers.

The product is not a marketing website. It is an operational dashboard used by a founder/admin to prepare orders for shipping. The UI must be extremely simple, calm, and understandable for a non-technical operator. Avoid dense enterprise clutter. A new user should understand the next action within 5 seconds.

## Product Context

ODUN has two separate systems:

- Pledge Manager: customer-facing Phase 1 selection and address collection.
- Fulfillment V1: downstream operational system for product readiness, shipping route, quote, payment lock, package/export preparation, and partner/provider handoff.

Fulfillment must never mutate live Pledge Manager production data during tests. Live shipping labels, live provider API pushes, Stripe live payments, and production exports are disabled until owner approval.

## Design Goal

Create an **Easyship-inspired shipping operations experience**, but do not copy Easyship branding, trade dress, logo, colors, exact layouts, or proprietary UI. Use the same kind of workflow clarity:

1. Choose order.
2. Check package details.
3. Compare shipping rates.
4. Prepare label/export only after payment lock.
5. Show tracking/provider status.
6. Surface blockers clearly.

## Language

All visible UI must be in Turkish. Use plain everyday Turkish, not technical English. Prefer:

- “Siparişler”
- “Kargo Merkezi”
- “Kargo Ücreti”
- “Ödemeler”
- “Kargoya Hazır”
- “Sorunlar”
- “Raporlar”
- “Hazır”
- “Blokaj”
- “Kontrol gerekli”
- “Canlı işlem kapalı”

Avoid unexplained words like `handoff`, `webhook`, `idempotency`, `route`, `quote`, `provider`, `mutation`. If unavoidable, add a Turkish label first.

## App Navigation

Use a persistent left sidebar on desktop and a compact stacked navigation on mobile.

Default pages:

- Kontrol Paneli
- Kargo Merkezi
- Siparişler
- Kargo Ücreti
- Ödemeler
- Kargoya Hazır
- Sorunlar
- Raporlar

The first viewport should not feel like a data table. It should feel like a clear workbench.

## Visual Style

Use a quiet operational design:

- Background: very light cool gray.
- Main surfaces: white.
- Primary action color: deep teal or blue-teal.
- Warning: amber.
- Danger: restrained red.
- Cards: 8px radius max.
- No decorative blobs, gradients, or marketing hero.
- No nested card-heavy composition.
- No tiny cramped text.
- No overlapping text.
- No negative letter spacing.
- Icons are useful and familiar, not decorative.

Spacing should be generous. A card should have one clear purpose. Buttons should fit their labels on desktop and mobile.

## Core Screen: Kargo Merkezi

Design the Kargo Merkezi as the clearest and most polished screen.

Layout:

- Top safety banner:
  - “Canlı etiket kapalı”
  - “PM verisi korunuyor”
  - “Sandbox fiyat denemesi”
- Main work area:
  - Left/top: selected order summary.
  - Middle: package details form.
  - Main area: rate comparison cards.
  - Right/bottom: safety checklist and selected rate summary.
- Bottom: shipment queue table.

The screen should answer:

- Hangi sipariş seçili?
- Paket ölçüsü/ağırlığı tamam mı?
- Hangi kargo seçeneği daha ucuz/hızlı?
- Etiket basmak güvenli mi?
- Neden canlı aksiyon kapalı?

Rate cards should show:

- Carrier/service label.
- Price.
- Delivery estimate.
- Badge: “En düşük fiyat”, “Hızlı”, “Kontrol gerekli”.
- Clear selected state.

Live label button must be visible but disabled, with text:

“Canlı etiket bas”

It should look disabled and safe. It must not feel clickable.

## Other Screens

Kontrol Paneli:

- Shows today’s next safe actions.
- Shows 4 simple metrics.
- Includes a compact version of Kargo Merkezi or a shortcut to it.

Siparişler:

- Readiness checklist for selected order.
- Address/Products/Route state in Turkish.
- “PM verisini değiştir” disabled.

Kargo Ücreti:

- Manual DDP quote panel.
- Sandbox/Mock provider rate preview.
- No live provider calls.

Ödemeler:

- Test payment event review.
- Amount/currency match check.
- Live payment disabled.

Kargoya Hazır:

- Export preview builder.
- CSV/JSON preview.
- Partner API push and label creation disabled.

Sorunlar:

- Blockers and assignments.
- “Ata”, “Not ekle”, “Doğrula”.

Raporlar:

- PII-safe aggregate totals only.
- No personal backer details.

## Interaction Rules

- Every page should have a 4-step plain-language guide near the top.
- Tables must have search, filter, selected-row detail, and safe local preview actions.
- Local/sandbox actions may be enabled.
- Live/export/payment/provider actions stay disabled unless explicitly approved.
- Use clear disabled-state explanation.

## Data Safety Messaging

Always keep safety visible:

- PM verisi korunuyor.
- Canlı değişiklikler kapalı.
- Kargo firması canlı gönderim kapalı.
- Etiket ve takip canlıya bağlanmadı.
- Token, PII, auth link gösterilmez.

## Deliverable

Generate a responsive desktop and mobile concept for the whole app, with special detail for Kargo Merkezi. Provide component-level layout guidance, not a marketing page.
