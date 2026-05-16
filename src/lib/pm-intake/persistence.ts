import { createHash } from "node:crypto";

import type { AddressStatus, LineRole, OrderStatus } from "../domain";
import {
  buildPmIntakePlan,
  buildPmSourceLineKey,
  type IntakeIssue,
  type ProductCatalogEntry,
} from "./processor";
import type { PmIntakePayload } from "./schema";

type JsonRecord = Record<string, unknown>;

export type PmIntakePersistenceProduct = ProductCatalogEntry & {
  id: string;
};

export type PmIntakeDownstreamReferenceCounts = Partial<{
  deliveryDecisions: number;
  shippingQuotes: number;
  paymentEvents: number;
  fulfillmentHandoffs: number;
  inventoryReservations: number;
}>;

export type ExistingPmIntakeOrder = {
  id: string;
  sourceOrderKey: string;
  orderStatus: OrderStatus;
  lockedAt?: string | null;
  downstreamReferences?: PmIntakeDownstreamReferenceCounts;
};

export type PmIntakePersistenceContext = {
  products: PmIntakePersistenceProduct[];
  existingOrder?: ExistingPmIntakeOrder | null;
  now?: string;
};

export type PmIntakeBackerUpsert = {
  source_backer_key: string;
  pm_backer_id?: string;
  backer_number?: string;
  display_name?: string;
  email?: string;
  locale?: string;
  metadata: JsonRecord;
};

export type PmIntakeOrderUpsert = {
  source_order_key: string;
  pm_pledge_id: string;
  order_number: string | null;
  order_status: OrderStatus;
  address_status: AddressStatus;
  recipient_snapshot: JsonRecord;
  order_snapshot: JsonRecord;
  locked_at: string | null;
  cancelled_at: string | null;
};

export type PmIntakeOrderLineReplacementRow = {
  source_line_key: string;
  product_id: string;
  sku: string;
  title: string;
  quantity: number;
  line_role: LineRole;
  is_visible: boolean;
  is_physical: boolean;
  is_builtin_main_box_item: boolean;
  unit_value_cents: number | null;
  unit_value_currency: string | null;
  metadata: JsonRecord;
};

export type PmIntakeExcludedBuiltinReplacementRow = {
  source_line_key: string;
  sku: string;
  quantity: number;
  exclusion_reason: "built_in_main_box_item";
};

export type PmIntakeBackerOperation = {
  operation: "upsert_backer";
  table: "backers";
  conflict: "source_backer_key";
  values: PmIntakeBackerUpsert;
};

export type PmIntakeOrderOperation = {
  operation: "upsert_order";
  table: "orders";
  conflict: "source_order_key";
  values: PmIntakeOrderUpsert;
};

export type PmIntakeOrderLinesOperation = {
  operation: "replace_order_lines";
  table: "order_lines";
  match: { source_order_key: string };
  rows: PmIntakeOrderLineReplacementRow[];
};

export type PmIntakeExcludedBuiltinsOperation = {
  operation: "replace_excluded_builtin_items";
  table: "excluded_builtin_items";
  match: { source_order_key: string };
  rows: PmIntakeExcludedBuiltinReplacementRow[];
};

export type PmIntakePersistenceOperation =
  | PmIntakeBackerOperation
  | PmIntakeOrderOperation
  | PmIntakeOrderLinesOperation
  | PmIntakeExcludedBuiltinsOperation;

export type PmIntakePersistencePlan = {
  sourceBackerKey: string;
  sourceOrderKey: string;
  payloadHash: string;
  idempotencyKey: string;
  blocked: boolean;
  issues: IntakeIssue[];
  operationMode: "plan_only";
  operations: PmIntakePersistenceOperation[];
  orderLineCount: number;
  excludedBuiltinItemCount: number;
};

export type PmIntakePersistenceSummary = {
  sourceOrderKey: string;
  payloadHash: string;
  idempotencyKey: string;
  blocked: boolean;
  issueCodes: string[];
  operationCount: number;
  plannedTables: string[];
  orderLineCount: number;
  excludedBuiltinItemCount: number;
};

export type SyntheticPmIntakeBackerRow = PmIntakeBackerUpsert & {
  id: string;
};

export type SyntheticPmIntakeOrderRow = PmIntakeOrderUpsert & {
  id: string;
  backer_id: string;
};

export type SyntheticPmIntakeOrderLineRow = PmIntakeOrderLineReplacementRow & {
  id: string;
  order_id: string;
};

export type SyntheticPmIntakeExcludedBuiltinItemRow = PmIntakeExcludedBuiltinReplacementRow & {
  id: string;
  order_id: string;
  order_line_id: string;
};

export type SyntheticPmIntakeStore = {
  backers: SyntheticPmIntakeBackerRow[];
  orders: SyntheticPmIntakeOrderRow[];
  orderLines: SyntheticPmIntakeOrderLineRow[];
  excludedBuiltinItems: SyntheticPmIntakeExcludedBuiltinItemRow[];
};

const DEFAULT_NOW = "1970-01-01T00:00:00.000Z";

function cleanRecord(values: JsonRecord) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function stableJsonStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`;

  const record = value as JsonRecord;
  const entries = Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`);

  return `{${entries.join(",")}}`;
}

export function hashPmIntakePayload(payload: PmIntakePayload) {
  return createHash("sha256").update(stableJsonStringify(payload)).digest("hex");
}

function blockerIssue(code: string, title: string, detail: string, sku?: string): IntakeIssue {
  return sku
    ? { severity: "blocker", code, title, detail, sku }
    : { severity: "blocker", code, title, detail };
}

function duplicateLineKeyIssues(payload: PmIntakePayload) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const line of payload.lines) {
    const sourceLineKey = buildPmSourceLineKey(payload.pledgeId, line);
    if (seen.has(sourceLineKey)) duplicates.add(sourceLineKey);
    seen.add(sourceLineKey);
  }

  return [...duplicates].map((sourceLineKey) =>
    blockerIssue(
      "duplicate_pm_intake_line_key",
      "Duplicate PM intake line key",
      `Source line key ${sourceLineKey} appears more than once in the PM intake payload.`,
    ),
  );
}

function downstreamTotal(references: PmIntakeDownstreamReferenceCounts = {}) {
  return Object.values(references).reduce((total, count) => total + (count ?? 0), 0);
}

function existingOrderGuardIssues(existingOrder?: ExistingPmIntakeOrder | null) {
  if (!existingOrder) return [];

  const issues: IntakeIssue[] = [];

  if (existingOrder.orderStatus === "locked_for_fulfillment" || existingOrder.lockedAt) {
    issues.push(
      blockerIssue(
        "order_locked_for_fulfillment",
        "Order is locked for fulfillment",
        "PM intake cannot replace an order that has already been locked for fulfillment.",
      ),
    );
  }

  const downstreamReferences = downstreamTotal(existingOrder.downstreamReferences);
  if (downstreamReferences > 0) {
    issues.push(
      blockerIssue(
        "downstream_fulfillment_state_exists",
        "Downstream fulfillment state exists",
        "PM intake cannot replace order lines after delivery, payment, inventory, or handoff state has been created.",
      ),
    );
  }

  return issues;
}

function hasBlocker(issues: IntakeIssue[]) {
  return issues.some((issue) => issue.severity === "blocker");
}

export function buildPmIntakePersistencePlan(
  payload: PmIntakePayload,
  context: PmIntakePersistenceContext,
): PmIntakePersistencePlan {
  const intakePlan = buildPmIntakePlan(payload, context.products);
  const payloadHash = hashPmIntakePayload(payload);
  const issues = [
    ...intakePlan.issues,
    ...duplicateLineKeyIssues(payload),
    ...existingOrderGuardIssues(context.existingOrder),
  ];
  const blocked = hasBlocker(issues);
  const basePlan = {
    sourceBackerKey: intakePlan.sourceBackerKey,
    sourceOrderKey: intakePlan.sourceOrderKey,
    payloadHash,
    idempotencyKey: `pm-intake-v1:${intakePlan.sourceOrderKey}:${payloadHash.slice(0, 16)}`,
    blocked,
    issues,
    operationMode: "plan_only" as const,
    operations: [],
    orderLineCount: intakePlan.orderLines.length,
    excludedBuiltinItemCount: intakePlan.excludedBuiltinItems.length,
  };

  if (blocked) return basePlan;

  const now = context.now ?? DEFAULT_NOW;
  const productBySku = new Map(context.products.map((product) => [product.sku, product]));
  const plannedLineByKey = new Map(intakePlan.orderLines.map((line) => [line.sourceLineKey, line]));

  const backerValues: PmIntakeBackerUpsert = {
    source_backer_key: intakePlan.sourceBackerKey,
    metadata: {
      intakeVersion: "pm-intake-v1",
      payloadHash,
    },
  };

  if (payload.backer.pmBackerId) backerValues.pm_backer_id = payload.backer.pmBackerId;
  if (payload.backer.backerNumber) backerValues.backer_number = payload.backer.backerNumber;
  if (payload.backer.displayName) backerValues.display_name = payload.backer.displayName;
  if (payload.backer.email) backerValues.email = payload.backer.email;
  if (payload.backer.locale) backerValues.locale = payload.backer.locale;

  const orderValues: PmIntakeOrderUpsert = {
    source_order_key: intakePlan.sourceOrderKey,
    pm_pledge_id: payload.pledgeId,
    order_number: payload.orderNumber ?? null,
    order_status: payload.orderStatus,
    address_status: payload.addressStatus,
    recipient_snapshot: payload.recipientSnapshot,
    order_snapshot: payload.orderSnapshot,
    locked_at: payload.orderStatus === "locked_for_fulfillment" ? now : null,
    cancelled_at: payload.orderStatus === "cancelled" ? now : null,
  };

  const lineRows = payload.lines.map((line) => {
    const sourceLineKey = buildPmSourceLineKey(payload.pledgeId, line);
    const plannedLine = plannedLineByKey.get(sourceLineKey);
    const product = productBySku.get(line.sku);

    if (!plannedLine || !product) {
      throw new Error(`Cannot build PM intake persistence row for unresolved line ${sourceLineKey}.`);
    }

    return {
      source_line_key: sourceLineKey,
      product_id: product.id,
      sku: plannedLine.sku,
      title: plannedLine.title,
      quantity: plannedLine.quantity,
      line_role: plannedLine.lineRole,
      is_visible: plannedLine.isVisible,
      is_physical: plannedLine.isPhysical,
      is_builtin_main_box_item: plannedLine.isBuiltinMainBoxItem,
      unit_value_cents: line.unitValueCents ?? null,
      unit_value_currency: line.unitValueCurrency ?? null,
      metadata: cleanRecord({
        intakeVersion: "pm-intake-v1",
        rewardCode: line.rewardCode,
        addOnId: line.addOnId,
      }),
    };
  });

  const excludedBuiltinRows = intakePlan.excludedBuiltinItems.map((item) => ({
    source_line_key: item.sourceLineKey,
    sku: item.sku,
    quantity: item.quantity,
    exclusion_reason: item.exclusionReason,
  }));

  return {
    ...basePlan,
    operations: [
      {
        operation: "upsert_backer",
        table: "backers",
        conflict: "source_backer_key",
        values: backerValues,
      },
      {
        operation: "upsert_order",
        table: "orders",
        conflict: "source_order_key",
        values: orderValues,
      },
      {
        operation: "replace_order_lines",
        table: "order_lines",
        match: { source_order_key: intakePlan.sourceOrderKey },
        rows: lineRows,
      },
      {
        operation: "replace_excluded_builtin_items",
        table: "excluded_builtin_items",
        match: { source_order_key: intakePlan.sourceOrderKey },
        rows: excludedBuiltinRows,
      },
    ],
  };
}

export function summarizePmIntakePersistencePlan(plan: PmIntakePersistencePlan): PmIntakePersistenceSummary {
  return {
    sourceOrderKey: plan.sourceOrderKey,
    payloadHash: plan.payloadHash,
    idempotencyKey: plan.idempotencyKey,
    blocked: plan.blocked,
    issueCodes: plan.issues.map((issue) => issue.code),
    operationCount: plan.operations.length,
    plannedTables: plan.operations.map((operation) => operation.table),
    orderLineCount: plan.orderLineCount,
    excludedBuiltinItemCount: plan.excludedBuiltinItemCount,
  };
}

export function createEmptySyntheticPmIntakeStore(): SyntheticPmIntakeStore {
  return {
    backers: [],
    orders: [],
    orderLines: [],
    excludedBuiltinItems: [],
  };
}

function syntheticUuid(scope: string, key: string) {
  const hash = createHash("sha256").update(`${scope}:${key}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function findOperation<T extends PmIntakePersistenceOperation["operation"]>(
  plan: PmIntakePersistencePlan,
  operation: T,
) {
  return plan.operations.find((candidate) => candidate.operation === operation) as
    | Extract<PmIntakePersistenceOperation, { operation: T }>
    | undefined;
}

export function applyPmIntakePersistencePlanToSyntheticStore(
  store: SyntheticPmIntakeStore,
  plan: PmIntakePersistencePlan,
): SyntheticPmIntakeStore {
  if (plan.blocked) throw new Error("Cannot apply a blocked PM intake persistence plan.");

  const backerOperation = findOperation(plan, "upsert_backer");
  const orderOperation = findOperation(plan, "upsert_order");
  const orderLinesOperation = findOperation(plan, "replace_order_lines");
  const excludedBuiltinsOperation = findOperation(plan, "replace_excluded_builtin_items");

  if (!backerOperation || !orderOperation || !orderLinesOperation || !excludedBuiltinsOperation) {
    throw new Error("PM intake persistence plan is missing required operations.");
  }

  const existingBacker = store.backers.find(
    (backer) => backer.source_backer_key === backerOperation.values.source_backer_key,
  );
  const backerId =
    existingBacker?.id ?? syntheticUuid("backers", backerOperation.values.source_backer_key);
  const nextBacker: SyntheticPmIntakeBackerRow = {
    ...existingBacker,
    ...backerOperation.values,
    id: backerId,
  };
  const backers = [
    ...store.backers.filter((backer) => backer.source_backer_key !== nextBacker.source_backer_key),
    nextBacker,
  ];

  const existingOrder = store.orders.find(
    (order) => order.source_order_key === orderOperation.values.source_order_key,
  );
  const orderId =
    existingOrder?.id ?? syntheticUuid("orders", orderOperation.values.source_order_key);
  const nextOrder: SyntheticPmIntakeOrderRow = {
    ...existingOrder,
    ...orderOperation.values,
    id: orderId,
    backer_id: backerId,
  };
  const orders = [
    ...store.orders.filter((order) => order.source_order_key !== nextOrder.source_order_key),
    nextOrder,
  ];

  const otherOrderLines = store.orderLines.filter((line) => line.order_id !== orderId);
  const nextOrderLines = orderLinesOperation.rows.map((line) => ({
    ...line,
    id: syntheticUuid("order_lines", `${orderId}:${line.source_line_key}`),
    order_id: orderId,
  }));
  const orderLineBySourceKey = new Map(nextOrderLines.map((line) => [line.source_line_key, line]));

  const otherExcludedBuiltins = store.excludedBuiltinItems.filter((item) => item.order_id !== orderId);
  const nextExcludedBuiltins = excludedBuiltinsOperation.rows.map((item) => {
    const orderLine = orderLineBySourceKey.get(item.source_line_key);

    if (!orderLine) {
      throw new Error(`Cannot link excluded built-in item ${item.source_line_key} to an order line.`);
    }

    return {
      ...item,
      id: syntheticUuid("excluded_builtin_items", `${orderId}:${item.source_line_key}`),
      order_id: orderId,
      order_line_id: orderLine.id,
    };
  });

  return {
    backers,
    orders,
    orderLines: [...otherOrderLines, ...nextOrderLines],
    excludedBuiltinItems: [...otherExcludedBuiltins, ...nextExcludedBuiltins],
  };
}
