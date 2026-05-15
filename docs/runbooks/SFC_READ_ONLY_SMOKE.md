# SFC Read-only Smoke Plan

Last updated: 2026-05-15

## Purpose

Prepare the SFC read-only API smoke without creating orders, ASN records, labels, exports, tracking updates, or partner handoffs.

Owner approved non-mutating provider checks on 2026-05-13. This runbook allows only read-only SFC calls and does not approve SFC order, ASN, product, label, export, tracking, or partner mutation.

## Required Owner Scope

- Confirm the SFC account and warehouse are safe for read-only checks.
- Configure credentials only in ignored local environment storage.
- Keep `SFC_ENABLE_MUTATIONS=false`.
- Use only read-only actions: `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and `getRate`/`getRateByMode`/`getRates`.
- Do not print raw SFC SOAP request/response bodies in notes, tickets, screenshots, or logs.

## Local Setup

Set these values in `.env.local` when owner-approved credentials are available:

```bash
SFC_MODE=read_only
SFC_WSDL_URL=http://fulfill.sfcservice.com/default/svc/wsdl
SFC_SERVICE_URL=http://cff-api.suntekcorps.com/default/svc/web-service
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

Do not paste credentials into docs, tickets, screenshots, or source files. If a credential value was ever shared through a non-secret channel, rotate it in SFC before using it for a production or pilot smoke.

Certificate-source review is tracked separately in `docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json`. That file must stay redacted: it records approval status only, never credential values.

## Env Doctor

```bash
npm run check:sfc-read-only-env
```

Expected safe behavior:

- Prints only presence/length checks, not credential values.
- Confirms `SFC_MODE=read_only`, read-only flag, mutation flag, warehouse ID, stock SKU, rate action, known WSDL host, and SOAP service endpoint.
- Requires `SFC_CERT_ROTATED_CONFIRMED=true` or approved redacted certificate-review evidence before reporting that the real read-only API smoke is safe to run.
- `npm run test:sfc-certificate-review` validates that the review packet is redacted; approved status additionally requires owner approval and certificate-source review fields.

## Planning Command

```bash
npm run smoke:sfc-read-only-plan
```

Expected safe behavior:

- Prints request action names only.
- Redacts SFC credential values.
- Reports `externalActions: "none"`.
- Exits non-zero until read-only mode, credentials, and flags are configured correctly.

## Read-only API Smoke Command

Run this only after `.env.local` has valid SFC credentials and `SFC_ENABLE_MUTATIONS=false`:

```bash
npm run smoke:sfc-read-only-api
```

Expected safe behavior:

- Executes only `getWarehouse`, `getShippingMethod`, `getStockBySKU`, and read-only rate lookup actions.
- Sends configured SFC credentials only inside the SOAP request body.
- Does not print raw request bodies, raw response bodies, credentials, or PII.
- Prints only action names, HTTP status, content type, response byte size, response SHA-256, SOAP fault flag, and credential echo flag.
- Exits non-zero if any response has an HTTP error, SOAP fault, credential echo, or request failure.
- Exits non-zero if the endpoint returns the WSDL document instead of a SOAP operation response.

## Product Visibility Smoke

After products are uploaded in SFC, verify SKU visibility with `getStockBySKU` only:

```bash
SFC_SMOKE_STOCK_SKUS=CLF-STV-ODN,CLF-STV-OLS npm run smoke:sfc-product-visibility
```

Expected safe behavior:

- Executes only `getStockBySKU`.
- Prints SKU, ask/message, stock fields, response hash, and warehouse ID.
- Does not print raw SOAP bodies or credentials.

## Blockers

- `SFC_ENABLE_MUTATIONS=true` is always blocked.
- Missing SFC credentials block the smoke plan.
- Pending `docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json` blocks formal pre-pilot pass.
- SFC order/ASN/product mutation still requires explicit owner approval in a separate step.
