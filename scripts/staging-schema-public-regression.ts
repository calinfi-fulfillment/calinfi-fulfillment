import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

import {
  assertNotPledgeManagerSupabaseUrl,
  fulfillmentSupabasePublishableKey,
  supabaseProjectRefFromUrl,
} from "../src/lib/safety";
import { loadLocalEnvFile } from "./load-local-env";

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
  "inventory_locations",
  "inventory_batches",
  "inventory_reservations",
] as const;

const requiredViews = ["fulfillment_stock_feed"] as const;

type SurfaceCheck = {
  table: (typeof requiredTables)[number];
  ok: boolean;
  status: number | null;
  code: string | null;
};

type ViewCheck = {
  view: (typeof requiredViews)[number];
  ok: boolean;
  status: number | null;
  code: string | null;
};

function redactUrl(value: string) {
  const projectRef = supabaseProjectRefFromUrl(value);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-url";
}

async function checkTableSurface() {
  loadLocalEnvFile();

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseKey = fulfillmentSupabasePublishableKey();

  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required for staging schema public check.");
  assert.ok(supabaseKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
  assertNotPledgeManagerSupabaseUrl(supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const tableResults: SurfaceCheck[] = [];

  for (const table of requiredTables) {
    const { error, status } = await supabase.from(table).select("id", { count: "exact" }).limit(0);

    tableResults.push({
      table,
      ok: !error,
      status: status ?? null,
      code: error?.code ?? null,
    });
  }

  const viewResults: ViewCheck[] = [];

  for (const view of requiredViews) {
    const { error, status } = await supabase.from(view).select("product_id", { count: "exact" }).limit(0);

    viewResults.push({
      view,
      ok: !error,
      status: status ?? null,
      code: error?.code ?? null,
    });
  }

  const missingOrBlockedTables = tableResults.filter((result) => !result.ok);
  const missingOrBlockedViews = viewResults.filter((result) => !result.ok);
  const missingOrBlocked = [...missingOrBlockedTables, ...missingOrBlockedViews];

  console.log(
    JSON.stringify(
      {
        ok: missingOrBlocked.length === 0,
        checked: "staging-schema-public",
        target: redactUrl(supabaseUrl),
        mode: "read-only-limit-zero-requests",
        tables: tableResults,
        views: viewResults,
        externalActions: "zero-row selects only; no row reads, inserts, updates, deletes, migrations, or RPC calls",
      },
      null,
      2,
    ),
  );

  assert.deepEqual(
    missingOrBlocked,
    [],
    `Staging Supabase public schema surface is missing or inaccessible for: ${missingOrBlocked
      .map((result) => {
        if ("table" in result) return `${result.table}${result.code ? `:${result.code}` : ""}`;
        return `${result.view}${result.code ? `:${result.code}` : ""}`;
      })
      .join(", ")}`,
  );
}

checkTableSurface().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
