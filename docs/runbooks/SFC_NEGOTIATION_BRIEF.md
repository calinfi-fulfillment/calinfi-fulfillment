# SFC Negotiation Brief

Last updated: 2026-05-13

## Goal

Finish the SFC side today by getting enough access to run non-mutating read-only smoke checks:

- `getWarehouse`
- `getShippingMethod`
- `getStockBySKU`
- `getRate`
- `getRateByMode` when SFC requires a specific shipping method code
- `getRates` when SFC prefers the shipping fee estimate sample method

No SFC mutation is approved by this brief.

## Official References

- SFC API overview: https://api.sendfromchina.com/api
- SFC Warehouse Fulfillment Service API PDF: https://fulfill.sendfromchina.com/file/Cff-API-3.0.pdf

The public SFC API page says the interface is available through SOAP and HTTP, and links API 3.0 plus demo/sample material. The PDF identifies the SOAP WSDL and the authentication fields used in SFC request headers.

## Ask SFC For These Today

1. API access for ODUN
   - Confirm API 3.0/3.1 access is enabled.
   - Confirm the correct WSDL URL for ODUN.
   - Confirm whether a demo/test account exists; if not, confirm that read-only checks are safe on the ODUN account.

2. Credentials
- Provide `customerId`, `appToken`, and `appKey`.
- Credentials must be entered only into ignored local/deployment env storage.
- Do not paste them into docs, tickets, screenshots, chat, or PR comments.
- Rotate the API certificate before pilot/prod smoke if a credential value was ever shared through a non-secret channel.

3. Warehouse activation
   - Confirm the canonical ODUN warehouse ID.
   - Confirm the warehouse is activated for API checks.
   - Confirm `getWarehouse` and `getShippingMethod` are allowed.

4. Stock lookup
   - Confirm ODUN SKU naming convention in SFC.
   - Confirm `getStockBySKU` access for ODUN SKUs.
   - Confirm which stock fields should be treated as available vs on-hold.

5. Asia DDP and rates
   - Confirm approved Asia DDP shipping method codes.
   - Confirm whether DDP/tax prepaid is method-dependent or an explicit field.
   - Confirm required rate parameters for `getRate`, `getRateByMode`, or `getRates`: country, warehouse/method code where applicable, weight, dimensions, state/division/postal code where applicable, and price type.

6. Mutation pilot boundary
   - `createOrder`, `createASN`, product create/update, order stop/intercept, label/tracking/export, and partner push are not part of today's read-only smoke.
   - Mutation pilot requires a separate owner-approved window, test order scope, rollback plan, and written go/no-go.

## Safe Local Env Shape

```bash
SFC_MODE=read_only
SFC_WSDL_URL=http://fulfill.sfcservice.com/default/svc/wsdl
SFC_CUSTOMER_ID=
SFC_APP_TOKEN=
SFC_APP_KEY=
SFC_CERT_ROTATED_CONFIRMED=false
SFC_ENABLE_READ_ONLY_API=true
SFC_ENABLE_MUTATIONS=false
SFC_SMOKE_WAREHOUSE_ID=1
SFC_SMOKE_STOCK_SKU=CLF-ODN-CORE
SFC_SMOKE_COUNTRY=HK
SFC_SMOKE_STATE=
SFC_SMOKE_DIVISION_ID=
SFC_SMOKE_ZIP_CODE=
SFC_SMOKE_SHIPPING_METHOD_CODE=
```

## Smoke Commands

Planning only:

```bash
npm run smoke:sfc-read-only-plan
```

Real read-only API smoke after credentials are configured:

```bash
npm run smoke:sfc-read-only-api
```

Expected output is only a safe summary: action names, HTTP status, response byte count, SHA-256 hash, SOAP fault flag, and credential echo flag. Raw SOAP request/response bodies must not be printed.

## Pasteable Message To SFC

We are preparing ODUN Fulfillment for a read-only SFC API smoke. For today we only need non-mutating checks: warehouse list, shipping methods, stock-by-SKU lookup, and rate lookup. Please enable/confirm API 3.0 or 3.1 access, provide the WSDL URL, ODUN warehouse ID, API credentials, approved Asia DDP method codes, and confirm whether DDP/tax prepaid is method-dependent or an explicit API field.

We will not create orders, create ASN records, create/update products, buy labels, export shipments, or push tracking in this first smoke. Those mutation steps will need a separate approval window after read-only checks pass.

## Done Criteria

- SFC credentials are configured only in ignored env storage.
- `SFC_ENABLE_MUTATIONS=false`.
- `npm run smoke:sfc-read-only-plan` returns ready.
- `npm run smoke:sfc-read-only-api` returns successful summaries for warehouse, shipping methods, stock, and rate.
- No raw credentials, raw SOAP bodies, or backer PII are logged.
