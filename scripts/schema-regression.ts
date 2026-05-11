import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BUILT_IN_SKUS,
  DECISION_SOURCES,
  DECISION_STATUSES,
  FULFILLMENT_ROUTE_TYPES,
  HANDOFF_STATUSES,
  ORDER_STATUSES,
  PAYMENT_EVENT_STATUSES,
  PRODUCT_READINESS_STATUSES,
  QUOTE_STATUSES,
  SHIPPING_MODES,
} from "../src/lib/domain";

const migration = readFileSync("supabase/migrations/0001_fulfillment_v1_core.sql", "utf8");
const hardeningMigration = readFileSync("supabase/migrations/0002_staging_schema_hardening.sql", "utf8");

const requiredTables = [
  "products",
  "backers",
  "orders",
  "order_lines",
  "excluded_builtin_items",
  "route_rules",
  "delivery_decisions",
  "shipping_quotes",
  "payment_events",
  "fulfillment_handoffs",
  "handoff_status_events",
  "issues",
  "audit_log",
];

for (const table of requiredTables) {
  assert.match(migration, new RegExp(`create table public\\.${table}\\b`), `${table} table must exist`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
}

const requiredEnumValues = [
  ...ORDER_STATUSES,
  ...DECISION_SOURCES,
  ...FULFILLMENT_ROUTE_TYPES,
  ...SHIPPING_MODES,
  ...DECISION_STATUSES,
  ...PRODUCT_READINESS_STATUSES,
  ...QUOTE_STATUSES,
  ...PAYMENT_EVENT_STATUSES,
  ...HANDOFF_STATUSES,
];

for (const value of requiredEnumValues) {
  assert.match(migration, new RegExp(`'${value}'`), `${value} enum value must exist in migration`);
}

for (const sku of BUILT_IN_SKUS) {
  assert.match(sku, /^CLF-/);
}

assert.match(migration, /unique \(order_id, source_line_key\)/);
assert.match(migration, /unique \(order_line_id\)/);
assert.match(migration, /total_cents integer generated always as \(amount_cents \+ buffer_cents\) stored/);
assert.doesNotMatch(migration, /\bpm_backers\b|\bpm_pledges\b|\bpm_pledge_items\b|\bpm_addresses\b/);

assert.match(hardeningMigration, /set search_path = public/);
assert.match(hardeningMigration, /create index if not exists order_lines_product_id_idx/);
assert.match(hardeningMigration, /create index if not exists shipping_quotes_delivery_decision_id_idx/);
assert.match(hardeningMigration, /create policy %I on public\.%I for all to anon, authenticated using \(false\) with check \(false\)/);
assert.doesNotMatch(hardeningMigration, /\bpm_backers\b|\bpm_pledges\b|\bpm_pledge_items\b|\bpm_addresses\b/);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "schema-regression",
      requiredTables,
      builtInSkuCount: BUILT_IN_SKUS.length,
      mode: "static-migration-only",
    },
    null,
    2,
  ),
);
