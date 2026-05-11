# PM Payment Due Contract

This contract is the Phase 2 server-side boundary between Pledge Manager and ODUN Fulfillment V1. It does not enable Stripe Checkout by itself.

## PM Rule

PM may show a payment CTA only after Fulfillment confirms a fresh quote:

- Quote status is `ready`.
- Quote is not expired.
- Current order fingerprint matches the quote fingerprint.
- Amount and currency shown to the backer match the Fulfillment quote.
- PM payment/Stripe feature flags are enabled in the PM app.

If any check fails, PM must hide payment CTA and show admin/backer review state instead.

## Fresh Quote Validation

Fulfillment exposes:

`POST /api/quotes/validate`

The first V1 implementation validates a supplied quote snapshot and current order fingerprint. Once the Fulfillment Supabase project is configured, this endpoint will look up the quote server-side instead of trusting client-provided quote data.

Response fields:

- `paymentAllowed`: `true` only for a fresh quote.
- `reason`: `fresh_quote`, `quote_expired`, `order_changed`, or quote status reason.
- `totalCents` and `currency`: amount PM must use for Checkout.

## Stripe Checkout Metadata

Stripe Checkout metadata must include:

- `fulfillment_order_id`
- `fulfillment_quote_id`
- `source_order_key`
- `quote_fingerprint`
- `amount_cents`
- `currency`
- `environment`: `test` or `live`

Fulfillment payment event processing must reject webhook events when metadata, amount, currency, quote, or order does not match.

## Safety

- Stripe live mode remains disabled until owner approval.
- PM production Phase 1 invite/save/lock must not depend on this contract while Phase 2 flags are off.
- This document contains no secrets, service keys, auth links, or PII examples.
