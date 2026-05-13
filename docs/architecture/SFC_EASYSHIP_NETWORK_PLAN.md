# SFC + Easyship Network Plan

Last updated: 2026-05-13

## Decision

SFC is the ODUN China origin hub. Easyship is the US/EU regional last-mile and rate/label layer.

SFC should not be treated as just another carrier. It owns the China-side physical source of truth:

- China warehouse and origin hub
- Product/stock readiness at origin
- ASN and inbound receiving from factory to SFC
- Bulk freight preparation from China to US/EU fulfillment depots
- Asia direct DDP shipping where SFC is the direct shipment provider

Easyship should be used after inventory reaches the US/EU regional fulfillment context:

- US last-mile rate comparison
- EU last-mile rate comparison
- Carrier label/tracking workflow for US/EU regional outbound
- Easyship sandbox/live label creation remains disabled until owner approval

## Route Families

| Route family | Origin | Middle leg | Final delivery | Primary provider |
| --- | --- | --- | --- | --- |
| `SFC_ASIA_DIRECT_DDP` | SFC China | None | Asia backer address | SFC |
| `SFC_TO_US_FREIGHT_EASYSHIP` | SFC China | Bulk freight to US depot | US backer address | Easyship |
| `SFC_TO_EU_FREIGHT_EASYSHIP` | SFC China | Bulk freight to EU depot | EU backer address | Easyship |
| `MANUAL_SPECIAL` | Case-specific | Case-specific | Case-specific | Manual/admin |

Current domain compatibility:

- Asia DDP maps to `CHINA_HK_DIRECT_DDP` + `DIRECT_DDP_PROVIDER` with provider `sendfromchina`.
- US/EU maps to `REGIONAL_3PL` while adding explicit origin/freight context: SFC origin, regional depot destination, Easyship last-mile.
- Manual exceptions remain `MANUAL_SPECIAL`.

## Cost Model

Asia DDP quote:

1. SFC direct DDP rate by destination country, weight, dimensions, shipping method.
2. Customs/DDP fields must be complete before quote readiness.
3. Apply ODUN buffer: 5 percent, minimum USD 3 equivalent, rounded up.
4. Snapshot quote with expiry.
5. Payment/covered approval locks order before any SFC order creation.

US/EU quote:

1. Allocate China-to-region bulk freight share by carton, weight, volume, and SKU count.
2. Add import/customs/receiving/handling estimate for the regional depot.
3. Add Easyship regional last-mile quote for US/EU final delivery.
4. Apply ODUN buffer and currency snapshot.
5. Lock only after payment/covered approval.

US/EU backer addresses should not be sent to SFC for normal bulk freight. SFC should receive SKU/carton/freight information; Easyship or the regional warehouse receives final recipient delivery data after payment lock.

## Data Additions To Plan

Future schema/domain fields should separate the network legs instead of hiding all logistics in one provider field:

- `origin_node`: `SFC_CHINA`
- `route_family`: `SFC_ASIA_DIRECT_DDP`, `SFC_TO_US_FREIGHT_EASYSHIP`, `SFC_TO_EU_FREIGHT_EASYSHIP`, `MANUAL_SPECIAL`
- `freight_leg_provider`: `sendfromchina`, `manual_forwarder`, or future freight provider
- `regional_node`: `US_3PL`, `EU_3PL`, or `SFC_DIRECT`
- `last_mile_provider`: `easyship`, `sendfromchina`, or `manual`
- `last_mile_mode`: Easyship service/mode code when selected
- `freight_batch_id`: bulk freight grouping for SFC-to-region moves
- `landed_cost_snapshot`: freight allocation, import duty/tax estimate, receiving, last-mile, buffer, currency

## Provider Responsibilities

SFC:

- Product sync and customs readiness
- Stock at China origin
- ASN/inbound from factory
- Bulk freight export preparation for US/EU
- Asia direct DDP order creation and status polling

Easyship:

- US/EU rate quote after regional route selection
- US/EU label/tracking after payment lock and regional fulfillment readiness
- Carrier comparison and service-level selection

ODUN Fulfillment:

- Route decision source of truth
- Quote snapshot and buffer
- Payment lock guard
- Batch creation and audit
- Provider handoff state
- PM boundary protection

## Safety Rules

- No PM production mutation.
- No SFC product/order/ASN mutation without explicit owner approval.
- No Easyship label/shipment/export/tracking live action without explicit owner approval.
- No credentials, API keys, tokens, auth links, or backer PII in repo docs or logs.
- Backer PII can only leave Fulfillment after payment lock and only to the provider that needs it for that leg.
- Bulk freight to US/EU should avoid sending final backer addresses to SFC.

## Implementation Phases

1. Document SFC + Easyship network model.
2. Add route family/types and fixture examples.
3. Add SFC read-only SOAP request planners: `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and read-only rate lookup.
4. Add SFC product/customs readiness mapping.
5. Add bulk freight batch planning and landed-cost allocation model.
6. Add Easyship regional last-mile quote planner for US/EU.
7. Add UI surfaces: SFC China Hub, Freight Batches, Easyship US/EU Last Mile.
8. Add synthetic regression tests for all three route families.
9. Owner-approved read-only SFC smoke.
10. Owner-approved Easyship sandbox rate smoke.
11. Only after explicit approval: SFC mutation pilot and Easyship label pilot.

Current local implementation status:

- Steps 1, 3, 4, 5, 6, 7, and 8 are implemented as local-only planning/preview surfaces.
- `NetworkReadiness` shows SFC China Hub, Freight Batch, and Easyship US/EU last-mile preview cards.
- SFC product/customs mapping converts Product Master rows into SFC sync readiness lines without backer PII.
- Freight batch planning groups US/EU regional lines into SFC-to-depot manifests with SKU, quantity, weight, and volume only.
- SFC SOAP plans redact credentials and PII, and every request plan reports `externalActions: none`.
- SFC read-only API smoke execution is now scripted for owner-approved non-mutating calls only; it executes the read-only action set without printing raw SOAP bodies.
- Easyship regional last-mile plans redact the token and remain request-plan-only.
- Easyship sandbox `/rates` smoke uses the sandbox Public API endpoint and keeps shipment, label, export, and tracking disabled.
- Real SFC read-only smoke remains credential-gated; Easyship sandbox `/rates` is currently blocked by HTTP 401 until the sandbox token/scope is corrected.

## Open Questions For SFC/Easyship Setup

- Which SFC warehouse ID should be canonical for ODUN origin stock?
- Is SFC warehouse activation complete, or still blocked by the `warehouse not activated` portal state?
- Which SFC shipping methods are approved for Asia DDP?
- Does SFC support DDP/tax prepaid as an explicit API field, or is it shipping-method dependent?
- Which US and EU regional depots will receive bulk freight?
- Will Easyship labels be bought by ODUN directly or through the regional depot account?
- Which party pays carrier invoices for regional last-mile: ODUN, 3PL, or Easyship account balance?
- Does the configured Easyship sandbox API token have `public.rate:read` for the 2024-09 Public API integration?
