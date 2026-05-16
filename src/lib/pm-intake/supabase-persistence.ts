import type { SupabaseClient } from "@supabase/supabase-js";

import { hasFulfillmentSupabaseServiceRoleConfig, liveMutationFlags, type SafetyEnv } from "../safety";
import {
  buildPmIntakePersistencePlan,
  summarizePmIntakePersistencePlan,
  type ExistingPmIntakeOrder,
  type PmIntakePersistencePlan,
  type PmIntakePersistenceProduct,
} from "./persistence";
import type { PmIntakePayload } from "./schema";

type AnyRow = Record<string, unknown>;

export type PmIntakeSupabasePersistenceResult = {
  blocked: boolean;
  code: string;
  excludedBuiltinItemCount: number;
  ok: boolean;
  orderId?: string;
  orderLineCount: number;
  plan: ReturnType<typeof summarizePmIntakePersistencePlan>;
  sourceOrderKey: string;
};

function clean(value: unknown, fallback: unknown = "") {
  return String(value ?? fallback).trim();
}

function tableError(table: string, error: { message?: string }) {
  return new Error(`${table} operation failed: ${error.message ?? "unknown error"}`);
}

function missingRelation(error: { code?: string; message?: string } | null | undefined) {
  const message = clean(error?.message).toLowerCase();
  return error?.code === "42P01" || error?.code === "PGRST205" || message.includes("does not exist");
}

async function rows<T = AnyRow>(query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>, table: string) {
  const { data, error } = await query;
  if (error) throw tableError(table, error);
  return data ?? [];
}

async function maybeSingle<T = AnyRow>(
  query: PromiseLike<{ data: T | null; error: { message?: string } | null }>,
  table: string,
) {
  const { data, error } = await query;
  if (error) throw tableError(table, error);
  return data;
}

function productFromRow(row: AnyRow): PmIntakePersistenceProduct {
  return {
    id: clean(row.id),
    isBuiltinMainBoxItem: row.is_builtin_main_box_item === true,
    readinessStatus: clean(row.readiness_status, "needs_review") as PmIntakePersistenceProduct["readinessStatus"],
    sku: clean(row.sku),
    title: clean(row.title),
  };
}

function operation<T extends PmIntakePersistencePlan["operations"][number]["operation"]>(
  plan: PmIntakePersistencePlan,
  name: T,
) {
  return plan.operations.find((candidate) => candidate.operation === name) as
    | Extract<PmIntakePersistencePlan["operations"][number], { operation: T }>
    | undefined;
}

export function isPmIntakeSupabasePersistenceEnabled(env: SafetyEnv = process.env) {
  const flags = liveMutationFlags(env);
  return flags.FULFILLMENT_ENABLE_PM_INTAKE && flags.FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS && hasFulfillmentSupabaseServiceRoleConfig(env);
}

async function downstreamCount(supabase: SupabaseClient, table: string, orderId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (error) {
    if (missingRelation(error)) return 0;
    throw tableError(table, error);
  }

  return count ?? 0;
}

async function existingOrderForPayload(supabase: SupabaseClient, payload: PmIntakePayload): Promise<ExistingPmIntakeOrder | null> {
  const sourceOrderKey = `pm:${payload.pledgeId}`;
  const row = await maybeSingle<AnyRow>(
    supabase
      .from("orders")
      .select("id,source_order_key,order_status,locked_at")
      .eq("source_order_key", sourceOrderKey)
      .maybeSingle(),
    "orders",
  );

  if (!row?.id) return null;

  const id = clean(row.id);
  const [deliveryDecisions, shippingQuotes, paymentEvents, fulfillmentHandoffs, inventoryReservations] = await Promise.all([
    downstreamCount(supabase, "delivery_decisions", id),
    downstreamCount(supabase, "shipping_quotes", id),
    downstreamCount(supabase, "payment_events", id),
    downstreamCount(supabase, "fulfillment_handoffs", id),
    downstreamCount(supabase, "inventory_reservations", id),
  ]);

  return {
    downstreamReferences: {
      deliveryDecisions,
      fulfillmentHandoffs,
      inventoryReservations,
      paymentEvents,
      shippingQuotes,
    },
    id,
    lockedAt: clean(row.locked_at) || null,
    orderStatus: clean(row.order_status, "selection_submitted") as ExistingPmIntakeOrder["orderStatus"],
    sourceOrderKey,
  };
}

export async function buildPmIntakePersistencePlanFromSupabase(
  supabase: SupabaseClient,
  payload: PmIntakePayload,
  now = new Date().toISOString(),
) {
  const skus = [...new Set(payload.lines.map((line) => line.sku).filter(Boolean))].sort();
  const productRows = skus.length
    ? await rows<AnyRow>(
        supabase
          .from("products")
          .select("id,sku,title,readiness_status,is_builtin_main_box_item")
          .in("sku", skus),
        "products",
      )
    : [];
  const existingOrder = await existingOrderForPayload(supabase, payload);

  return buildPmIntakePersistencePlan(payload, {
    existingOrder,
    now,
    products: productRows.map(productFromRow),
  });
}

export async function applyPmIntakePersistencePlanWithSupabase(
  supabase: SupabaseClient,
  plan: PmIntakePersistencePlan,
): Promise<PmIntakeSupabasePersistenceResult> {
  const summary = summarizePmIntakePersistencePlan(plan);
  if (plan.blocked) {
    return {
      blocked: true,
      code: plan.issues[0]?.code ?? "pm_intake_blocked",
      excludedBuiltinItemCount: plan.excludedBuiltinItemCount,
      ok: false,
      orderLineCount: plan.orderLineCount,
      plan: summary,
      sourceOrderKey: plan.sourceOrderKey,
    };
  }

  const backerOperation = operation(plan, "upsert_backer");
  const orderOperation = operation(plan, "upsert_order");
  const orderLinesOperation = operation(plan, "replace_order_lines");
  const excludedBuiltinsOperation = operation(plan, "replace_excluded_builtin_items");

  if (!backerOperation || !orderOperation || !orderLinesOperation || !excludedBuiltinsOperation) {
    throw new Error("PM intake persistence plan is missing required operations.");
  }

  const backer = await maybeSingle<AnyRow>(
    supabase
      .from("backers")
      .upsert(backerOperation.values, { onConflict: backerOperation.conflict })
      .select("id")
      .maybeSingle(),
    "backers",
  );
  if (!backer?.id) throw new Error("PM intake backer upsert did not return an id.");

  const order = await maybeSingle<AnyRow>(
    supabase
      .from("orders")
      .upsert(
        {
          ...orderOperation.values,
          backer_id: clean(backer.id),
        },
        { onConflict: orderOperation.conflict },
      )
      .select("id")
      .maybeSingle(),
    "orders",
  );
  if (!order?.id) throw new Error("PM intake order upsert did not return an id.");

  const orderId = clean(order.id);
  const { error: deleteExcludedError } = await supabase
    .from("excluded_builtin_items")
    .delete()
    .eq("order_id", orderId);
  if (deleteExcludedError) throw tableError("excluded_builtin_items", deleteExcludedError);

  const { error: deleteLinesError } = await supabase
    .from("order_lines")
    .delete()
    .eq("order_id", orderId);
  if (deleteLinesError) throw tableError("order_lines", deleteLinesError);

  const insertedLines = orderLinesOperation.rows.length
    ? await rows<AnyRow>(
        supabase
          .from("order_lines")
          .insert(orderLinesOperation.rows.map((line) => ({ ...line, order_id: orderId })))
          .select("id,source_line_key"),
        "order_lines",
      )
    : [];
  const lineIdBySourceKey = new Map(insertedLines.map((line) => [clean(line.source_line_key), clean(line.id)]));
  const excludedRows = excludedBuiltinsOperation.rows.map((item) => {
    const { source_line_key: sourceLineKey, ...values } = item;
    const orderLineId = lineIdBySourceKey.get(sourceLineKey);
    if (!orderLineId) throw new Error(`Missing order line id for built-in exclusion ${sourceLineKey}.`);
    return {
      ...values,
      order_id: orderId,
      order_line_id: orderLineId,
    };
  });

  if (excludedRows.length) {
    const { error } = await supabase.from("excluded_builtin_items").insert(excludedRows);
    if (error) throw tableError("excluded_builtin_items", error);
  }

  return {
    blocked: false,
    code: "pm_intake_persisted",
    excludedBuiltinItemCount: excludedRows.length,
    ok: true,
    orderId,
    orderLineCount: insertedLines.length,
    plan: summary,
    sourceOrderKey: plan.sourceOrderKey,
  };
}

export async function persistPmIntakePayloadWithSupabase(
  supabase: SupabaseClient,
  payload: PmIntakePayload,
): Promise<PmIntakeSupabasePersistenceResult> {
  const plan = await buildPmIntakePersistencePlanFromSupabase(supabase, payload);
  return applyPmIntakePersistencePlanWithSupabase(supabase, plan);
}
