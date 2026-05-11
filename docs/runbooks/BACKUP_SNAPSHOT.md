# Backup And Snapshot Procedure

Use this only before an owner-approved live pilot or production mutation. This document intentionally avoids secrets and raw connection strings.

## PM Critical Tables

Snapshot these PM tables before any approved live mutation:

- `pm_backers`
- `pm_pledges`
- `pm_pledge_items`
- `pm_addresses`
- `pm_delivery_decisions`
- `pm_payment_events`
- `pm_audit_events`

## Rules

- Store snapshots in an access-controlled location outside the repo.
- Do not commit snapshots to git.
- Do not paste customer rows, addresses, emails, phone numbers, auth links, tokens, or service keys into logs or docs.
- Record only aggregate counts in project notes.

## Aggregate Verification

Before and after pilot, compare:

- Row counts by table.
- Status distributions.
- Count of payment due / payment event rows.
- Count of fulfillment intake links.
- Count of audit events produced by the pilot.

Unexpected changes mean flags are turned off and records move to admin review.
