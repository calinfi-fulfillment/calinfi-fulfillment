# PM Product Master And Package Planning Notes

Last updated: 2026-05-15

These notes capture owner-approved architecture direction for a later batch implementation. They are not an implementation, migration, provider action, or production launch approval.

## Decisions To Batch Later

- Pledge Manager should become the source of truth for Product Master management so admins maintain products from one panel.
- Fulfillment should keep a published operational snapshot of the PM Product Master, not a separately managed duplicate catalog.
- PM should publish catalog snapshots into Fulfillment with a `catalogVersion`.
- Backer submit/intake payloads should carry the `catalogVersion` used by the pledge.
- Fulfillment blockers should be based on the published PM catalog snapshot:
  - SKU missing from the published PM catalog snapshot.
  - Fulfillment/package/customs attributes missing or stale.
  - Catalog snapshot version unavailable for the order.
- Quote calculation should run from a package plan, not directly from individual order lines.
- Accessory-heavy pledges should be bundled into package units where rules allow, so accessories are not priced as separate shipments.
- Built-in main-box items remain visible order lines but do not become separate physical package lines.
- Quote/payment lock fingerprints should include order lines, address, catalog version, package plan version, route rule version, and package units.

## Required Product Master Fields

PM Product Master needs fulfillment-grade attributes before publish:

- SKU, title, reward/add-on relationships.
- Weight and dimensions.
- Customs description, HS code, country of origin, declared value.
- Battery/liquid/hazmat/oversize/restricted flags.
- Bundle rules: can bundle with main ODUN box, can bundle with accessories, requires separate box.
- Package constraints: max quantity per package, preferred package type, ship group.
- Route constraints: Asia direct DDP allowed, regional 3PL allowed, manual review required.

## Package Planning Model

Fulfillment should transform order lines into package units before quote:

- Main ODUN box package.
- Compatible accessories bundled into the main box when allowed.
- Accessory bundle parcel when main-box capacity or rules do not allow bundling.
- Separate parcel for oversized, fragile, restricted, or separate-box-required items.
- Manual review package for ambiguous or missing package data.

Quote providers should receive package units with final aggregate weight and dimensions, not raw accessory lines as independent parcels.

## Provider Boundary

- Easyship can rate/label package units after Fulfillment has generated package dimensions and weights.
- SFC rate calls also require package weight/dimensions; do not assume SFC will perform pre-order auto-cartonization for quote.
- SFC sales confirmed there is no pre-order package planning function before order creation; ODUN/CALINFI should own box selection and package units.
- SFC can show estimated shipping cost after uploaded orders are matched with shipping channels.
- SFC final measured package data and tracking number, if returned after packing/shipping, can update actuals and variance reporting, but should not replace Fulfillment's pre-payment quote snapshot without a review flow.
- Fulfillment should normalize SFC post-upload estimate, final measured parcels, final fee, and tracking into a read-only variance report. The normalized report must compare against the Package Plan fingerprint and pre-payment quote without storing raw backer PII.

## Safety

- No PM production mutation is implied by this note.
- No SFC, Easyship, 3PL, label, export, tracking, payment, or production migration action is implied by this note.
- No secrets, raw PII, tokens, auth links, or service keys belong in this document.
