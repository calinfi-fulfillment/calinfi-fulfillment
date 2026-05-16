# Shipping DDP Pricing Research

Last updated: 2026-05-15

This note captures research and architecture direction for quoting ODUN/CALINFI shipping before orders are created with SFC, Easyship, or a regional 3PL. It is not a provider action, production launch approval, payment change, label purchase, or customs/legal advice.

## Decision

ODUN/CALINFI should own the pre-payment pricing model. SFC and Easyship should be treated as rate, tax/duty, label, tracking, and fulfillment providers, not as the source of truth for order-to-package planning.

Backer-facing quote calculation should price physical package units, not raw order lines:

```text
Backer order lines
-> PM Product Master snapshot
-> Fulfillment package plan
-> route/provider selection
-> shipping + warehouse + packaging + duties/taxes
-> risk buffer
-> payment lock
```

The quote/payment lock fingerprint should include the order lines, address, catalog version, package plan version, route rule version, provider rate table/API version, declared values, and selected incoterm.

## Package Planning

The system should generate package units before requesting rates:

- Main ODUN box package.
- Compatible accessories bundled into the main box when the PM Product Master rules allow it.
- Accessory bundle parcel when main-box capacity or rules do not allow bundling.
- Separate parcel for oversized, fragile, restricted, or separate-box-required SKUs.
- Manual review package when package, customs, or route data is incomplete.

Built-in main-box contents remain visible order lines, but they must not become separate physical package lines.

## Quote Formula

Backer shipping charge should be built from auditable components:

```text
provider shipping fee
+ warehouse pick and pack
+ packaging materials
+ add-on packing labor, if needed
+ prepaid duty/VAT/tariff, if applicable
+ DDP/disbursement/handling fees, if applicable
+ currency and risk buffer
```

Each component should be stored separately so admin can explain a quote, compare provider actuals later, and calibrate buffers after fulfillment.

## SFC Findings

The SFC quote workbooks provided by sales are package-based, not order-line-based. The primary quoted ODUN package assumption is `50 x 50 x 55 cm / 23 kg`.

The newer workbook, `SFC quotation-Ersin (2).xlsx`, states that VAT is not included in shipping fees and needs to be calculated separately. It also includes both sea and air columns for several lanes.

SFC sales confirmed on 2026-05-15:

- SFC currently does not provide pre-order auto cartonization/package planning before orders are created.
- After orders are uploaded and matched with shipping channels, SFC shows an estimated shipping cost in the system.
- After packing, SFC conducts a final measurement before shipping.
- Tracking number is available after the shipment is created.
- Box dimensions should be owned by ODUN/CALINFI or represented as separate box/packaging SKUs and matched to accessories/packing rules.

Observed SFC workbook model:

- US appears as DDP with tariffs included in the shipping fee, but this needs written reconfirmation for ODUN HS codes, declared values, and current US import rules.
- EU DDP lanes require VAT to be paid before shipping, using the workbook note of 25% of declared value.
- UK, Australia, Singapore, Thailand, and Malaysia appear as DDU lanes where the recipient may need to pay taxes/duties.
- SFC warehouse fees include first-unit pick and pack, additional-unit pick fees, packaging material, and optional add-on labor.

SFC API v3.1 exposes rate endpoints using country, weight, dimensions, warehouse, and method code. It returns shipping fee fields and whether volumetric weight is used. Based on the sales confirmation, pre-payment quotes should not depend on SFC pre-order cartonization. SFC post-upload estimate and final measurement should instead be treated as reconciliation/variance evidence against ODUN/CALINFI's pre-payment Package Plan.

The implemented local variance contract uses a normalized read-only SFC snapshot:

- `referenceNo`, source order key, and Package Plan fingerprint for matching.
- Post-upload shipping-channel estimate, method/channel label, and estimated shipping fee.
- Final measured parcels, actual weight/dimensions, final fee, and tracking number.
- No backer PII, raw SOAP body, secret, live order mutation, label purchase, or export action.

## Easyship Findings

Easyship can be useful as a live rate and landed-cost source, especially where SFC returns DDU or where regional last-mile options need comparison.

Easyship rate requests support DDP/DDU incoterms, parcels, weight, box dimensions, item data, and optional tax/duty calculation. Easyship's documentation says DDP requires tax/duty calculation and only eligible courier services are returned for prepaid duties/taxes.

Easyship should not replace our Package Plan. It should receive package units and customs payloads generated from the PM Product Master snapshot.

## Customs And DDP Guardrails

Only sell "prepaid DDP" to backers when the selected provider/method/country combination is explicitly confirmed as duty/tax included for ODUN's product class and declared values.

US needs fresh written confirmation from SFC or another provider. Current US de minimis treatment has changed materially, so any old "$800 duty free" assumption should not be used as a pricing rule.

EU needs special handling:

- VAT applies regardless of value for non-EU imports.
- IOSS can simplify VAT collection for consignments up to EUR 150.
- Goods over EUR 150 may incur customs duties.
- From 2026-07-01, the EU Council has agreed to a fixed EUR 3 customs duty on small parcels under EUR 150 for IOSS-registered non-EU sellers.

DDU lanes should either show a clear "duties/taxes not included" status, be routed through a provider with confirmed prepaid landed-cost support, or go to manual admin review.

## Required PM Product Master Fields

Each publishable SKU needs fulfillment-grade data:

- SKU, title, product type, reward/add-on relationships.
- Weight and dimensions.
- Customs description, HS code, country of origin, declared value, currency.
- Battery, liquid, hazmat, fragile, restricted, and oversized flags.
- Bundle rules: can bundle with main box, can bundle with accessories, requires separate box.
- Package constraints: max quantity per package, preferred package type, ship group.
- Route constraints: SFC direct DDP allowed, Easyship DDP allowed, regional 3PL allowed, DDU allowed, manual review required.
- Catalog version and publish timestamp.

Package-planning metadata should include:

- Main-box capacity impact.
- Accessory weight and volume impact.
- Estimated packaging material type and cost.
- Estimated pick/pack unit count.

## Open Questions For SFC

Use this short list with SFC sales/support:

```text
1. Which SFC method codes are true DDP/tax-included for ODUN by country?
2. For EU, does the 25% declared-value VAT cover all import VAT, duty, customs, and handling costs, or only VAT?
3. For US, are tariffs fully included in the quoted shipping fee for ODUN's HS codes and declared values under current rules?
4. Can SFC provide pre-order cartonization/package count by API, or must ODUN calculate package units before quoting?
5. For one order with main box plus accessories, can SFC pack everything into one parcel when physically possible?
6. After packing, can the API return final parcel count, actual weight/dimensions, shipping fee, tax fee, and tracking?
7. What are the declared-value limits per country and method code?
8. Which countries should not be offered as prepaid DDP?
```

## Implementation Direction

Implement pricing in this order:

1. PM Product Master fulfillment fields and publishable snapshot.
2. Fulfillment package planner that converts order lines into package units.
3. Route rules that choose SFC, Easyship, regional 3PL, DDU, or manual review by destination and package constraints.
4. Quote engine that stores componentized charges and the quote fingerprint.
5. Admin review surface for missing SKU data, unconfirmed DDP lanes, high variance, and manual routes.
6. SFC order/shipping-channel estimate capture after upload, without exposing raw PII or secrets in logs.
7. Post-fulfillment variance report comparing quoted package units against SFC estimated cost, final package count, actual weight/dimensions, final fee, and tracking number.

Local implementation status on 2026-05-15: steps 2, 4, 6, and 7 are covered by synthetic/read-only code paths for Package Plan, package-unit quote inputs, SFC packing export preview, and variance reporting. Real SFC field names and method-code/DDP semantics still require provider confirmation before live launch.

## Sources Reviewed

- SFC quote workbooks provided by sales: `SFC quotation-Ersin (2).xlsx`, `SFC quotation-Ersin (3).xlsx`.
- SFC Warehouse Fulfillment Service API v3.1: https://fulfill.sendfromchina.com/file/Cff-API-3.0.pdf
- SFC DDP/DDU guide: https://www.sendfromchina.com/help/DDP%26%20DDU%20.html
- Easyship Request Rates API: https://developers.easyship.com/reference/rates_request
- Easyship tax and duty API guide: https://developers.easyship.com/v2023.01/docs/how-to-calculate-taxes-and-duties
- Easyship duties and taxes checkout guide: https://support.easyship.com/hc/en-us/articles/19240852760722-Duties-Taxes-at-Checkout
- U.S. CBP de minimis suspension guidance: https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3f01456
- European Commission low-value consignment guidance: https://taxation-customs.ec.europa.eu/customs/customs-procedures-import-and-export/customs-operations/customs-formalities-low-value-consignments_en
- European Commission non-EU online purchase guidance: https://taxation-customs.ec.europa.eu/customs/customs-procedures-import-and-export/importation/buying-goods-online-coming-non-european-union-country_en
- EU Council small-parcel customs duty update: https://www.consilium.europa.eu/en/press/press-releases/2025/12/12/customs-council-agrees-to-levy-customs-duty-on-small-parcels-as-of-1-july-2026/
