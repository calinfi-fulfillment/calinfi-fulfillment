import assert from "node:assert/strict";

import {
  applyPmIntakePersistencePlanToSyntheticStore,
  buildPmIntakePersistencePlan,
  createEmptySyntheticPmIntakeStore,
  summarizePmIntakePersistencePlan,
  type PmIntakePersistenceProduct,
} from "../src/lib/pm-intake/persistence";
import { buildPmIntakePlan } from "../src/lib/pm-intake/processor";
import { PmIntakePayloadSchema, type PmIntakePayload } from "../src/lib/pm-intake/schema";
import { signPmIntakePayload, verifyPmIntakeSignature } from "../src/lib/pm-intake/signature";
import { isPmIntakeSupabasePersistenceEnabled } from "../src/lib/pm-intake/supabase-persistence";

const products: PmIntakePersistenceProduct[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    sku: "CLF-ACC-STAND",
    title: "Display Stand",
    readinessStatus: "ready",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    readinessStatus: "ready",
    isBuiltinMainBoxItem: true,
  },
];

const payload: PmIntakePayload = {
  pledgeId: "11111111-1111-4111-8111-111111111111",
  orderNumber: "ODUN-SYN-001",
  orderStatus: "selection_submitted",
  addressStatus: "complete",
  backer: {
    pmBackerId: "22222222-2222-4222-8222-222222222222",
    sourceBackerKey: "pm:backer:synthetic-001",
    displayName: "Synthetic Backer",
    email: "synthetic@example.test",
  },
  recipientSnapshot: { countryCode: "US" },
  orderSnapshot: { source: "synthetic" },
  lines: [
    {
      lineRole: "reward",
      rewardCode: "ODUN_CORE",
      sku: "CLF-ODN-CORE",
      title: "ODUN Core Box",
      quantity: 1,
    },
    {
      lineRole: "addon",
      addOnId: "addon-stand",
      sku: "CLF-ACC-STAND",
      title: "Display Stand",
      quantity: 1,
    },
    {
      lineRole: "builtin",
      rewardCode: "ODUN_CORE",
      sku: "CLF-ACC-UNI-HND",
      title: "Universal Handle",
      quantity: 1,
      isBuiltinMainBoxItem: true,
    },
  ],
};

const rawBody = JSON.stringify(payload);
const signature = signPmIntakePayload(rawBody, "synthetic-secret");

assert.equal(verifyPmIntakeSignature(rawBody, signature, "synthetic-secret"), true);
assert.equal(verifyPmIntakeSignature(rawBody, signature, "wrong-secret"), false);

const parsed = PmIntakePayloadSchema.parse(payload);
const plan = buildPmIntakePlan(parsed, products);
const repeatPlan = buildPmIntakePlan(parsed, products);

assert.equal(plan.sourceOrderKey, `pm:${payload.pledgeId}`);
assert.equal(plan.sourceBackerKey, "pm:backer:synthetic-001");
assert.deepEqual(
  plan.orderLines.map((line) => line.sourceLineKey),
  repeatPlan.orderLines.map((line) => line.sourceLineKey),
);
assert.deepEqual(plan.issues, []);
assert.equal(plan.blocked, false);
assert.equal(plan.orderLines.find((line) => line.sku === "CLF-ACC-UNI-HND")?.isPhysical, false);
assert.equal(plan.excludedBuiltinItems.length, 1);

const persistencePlan = buildPmIntakePersistencePlan(parsed, {
  products,
  now: "2026-01-01T00:00:00.000Z",
});
const persistenceSummary = summarizePmIntakePersistencePlan(persistencePlan);

assert.equal(persistencePlan.blocked, false);
assert.deepEqual(persistenceSummary.plannedTables, [
  "backers",
  "orders",
  "order_lines",
  "excluded_builtin_items",
]);
assert.equal(persistenceSummary.orderLineCount, 3);
assert.equal(persistenceSummary.excludedBuiltinItemCount, 1);
assert.equal(JSON.stringify(persistenceSummary).includes("synthetic@example.test"), false);
assert.equal(JSON.stringify(persistenceSummary).includes("Synthetic Backer"), false);

const firstStore = applyPmIntakePersistencePlanToSyntheticStore(
  createEmptySyntheticPmIntakeStore(),
  persistencePlan,
);
assert.equal(firstStore.backers.length, 1);
assert.equal(firstStore.orders.length, 1);
assert.equal(firstStore.orderLines.length, 3);
assert.equal(firstStore.excludedBuiltinItems.length, 1);

const updatedPayload: PmIntakePayload = {
  ...parsed,
  lines: parsed.lines.map((line) =>
    line.sku === "CLF-ACC-STAND"
      ? {
          ...line,
          quantity: 2,
        }
      : line,
  ),
};
const updatedPlan = buildPmIntakePersistencePlan(updatedPayload, {
  products,
  now: "2026-01-01T00:00:00.000Z",
});
const secondStore = applyPmIntakePersistencePlanToSyntheticStore(firstStore, updatedPlan);
assert.equal(secondStore.backers.length, 1);
assert.equal(secondStore.orders.length, 1);
assert.equal(secondStore.orderLines.length, 3);
assert.equal(secondStore.excludedBuiltinItems.length, 1);
assert.equal(secondStore.orderLines.find((line) => line.sku === "CLF-ACC-STAND")?.quantity, 2);

const missingProductPlan = buildPmIntakePersistencePlan(
  {
    ...parsed,
    lines: [
      {
        lineRole: "addon",
        sku: "CLF-MISSING-SKU",
        title: "Missing SKU",
        quantity: 1,
      },
    ],
  },
  { products },
);
assert.equal(missingProductPlan.blocked, true);
assert.equal(missingProductPlan.operations.length, 0);
assert.equal(missingProductPlan.issues.some((issue) => issue.code === "missing_product_master_sku"), true);

const lockedOrderPlan = buildPmIntakePersistencePlan(parsed, {
  products,
  existingOrder: {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    sourceOrderKey: `pm:${parsed.pledgeId}`,
    orderStatus: "locked_for_fulfillment",
    lockedAt: "2026-01-01T00:00:00.000Z",
  },
});
assert.equal(lockedOrderPlan.blocked, true);
assert.equal(lockedOrderPlan.operations.length, 0);
assert.equal(lockedOrderPlan.issues.some((issue) => issue.code === "order_locked_for_fulfillment"), true);

const downstreamPlan = buildPmIntakePersistencePlan(parsed, {
  products,
  existingOrder: {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    sourceOrderKey: `pm:${parsed.pledgeId}`,
    orderStatus: "fulfillment_ready",
    downstreamReferences: {
      fulfillmentHandoffs: 1,
    },
  },
});
assert.equal(downstreamPlan.blocked, true);
assert.equal(downstreamPlan.operations.length, 0);
assert.equal(downstreamPlan.issues.some((issue) => issue.code === "downstream_fulfillment_state_exists"), true);

const duplicateLinePlan = buildPmIntakePersistencePlan(
  {
    ...parsed,
    lines: [
      {
        ...parsed.lines[0],
        sourceLineKey: "pm:synthetic:duplicate",
      },
      {
        ...parsed.lines[1],
        sourceLineKey: "pm:synthetic:duplicate",
      },
    ],
  },
  { products },
);
assert.equal(duplicateLinePlan.blocked, true);
assert.equal(duplicateLinePlan.operations.length, 0);
assert.equal(duplicateLinePlan.issues.some((issue) => issue.code === "duplicate_pm_intake_line_key"), true);

assert.equal(isPmIntakeSupabasePersistenceEnabled({}), false);
assert.equal(
  isPmIntakeSupabasePersistenceEnabled({
    FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "true",
    FULFILLMENT_ENABLE_PM_INTAKE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://cjygwbfjekhhvwlyujyj.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  }),
  false,
  "PM Supabase ref must never be accepted as Fulfillment persistence config.",
);
assert.equal(
  isPmIntakeSupabasePersistenceEnabled({
    FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "true",
    FULFILLMENT_ENABLE_PM_INTAKE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://fulfillmentref.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  }),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "pm-intake",
      sourceOrderKey: plan.sourceOrderKey,
      lineCount: plan.orderLines.length,
      persistenceTables: persistenceSummary.plannedTables,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
