# SFC Read-only Smoke Plan

Last updated: 2026-05-13

## Purpose

Prepare the SFC read-only API smoke without creating orders, ASN records, labels, exports, tracking updates, or partner handoffs.

Owner approved non-mutating provider checks on 2026-05-13. This runbook allows only read-only SFC calls and does not approve SFC order, ASN, product, label, export, tracking, or partner mutation.

## Required Owner Scope

- Confirm the SFC account and warehouse are safe for read-only checks.
- Configure credentials only in ignored local environment storage.
- Keep `SFC_ENABLE_MUTATIONS=false`.
- Use only read-only actions: `getWarehouse`, `getShippingMethod`, `getStock`, and `getRate`.
- Do not print raw SFC SOAP request/response bodies in notes, tickets, screenshots, or logs.

## Local Setup

Set these values in `.env.local` when owner-approved credentials are available:

```bash
SFC_MODE=read_only
SFC_WSDL_URL=http://fulfill.sfcservice.com/default/svc/wsdl
SFC_CUSTOMER_ID=
SFC_APP_TOKEN=
SFC_APP_KEY=
SFC_ENABLE_READ_ONLY_API=true
SFC_ENABLE_MUTATIONS=false
SFC_SMOKE_WAREHOUSE_ID=1
SFC_SMOKE_STOCK_SKU=CLF-ODN-CORE
SFC_SMOKE_COUNTRY=HK
SFC_SMOKE_SHIPPING_METHOD_CODE=
```

Do not paste credentials into docs, tickets, screenshots, or source files.

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

- Executes only `getWarehouse`, `getShippingMethod`, `getStock`, and `getRate`/`getRateByMode`.
- Sends configured SFC credentials only inside the SOAP request body.
- Does not print raw request bodies, raw response bodies, credentials, or PII.
- Prints only action names, HTTP status, content type, response byte size, response SHA-256, SOAP fault flag, and credential echo flag.
- Exits non-zero if any response has an HTTP error, SOAP fault, credential echo, or request failure.

## Blockers

- `SFC_ENABLE_MUTATIONS=true` is always blocked.
- Missing SFC credentials block the smoke plan.
- SFC order/ASN/product mutation still requires explicit owner approval in a separate step.
