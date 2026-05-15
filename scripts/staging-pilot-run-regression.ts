import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF } from "../src/lib/safety";
import { createSyntheticPilotImportPlan } from "../src/lib/staging-prep";

type StagingPilotOrder = {
  sourceOrderKey?: string;
  scenario?: string;
  routeType?: string;
  shippingMode?: string;
  externalActions?: string;
};

type StagingPilotRunEvidence = {
  provider?: string;
  checkedAt?: string;
  status?: string;
  scope?: {
    ownerApproved?: boolean;
    mode?: string;
    stagingProjectRef?: string;
    fixture?: string;
    allowlistedSourceOrderKeys?: string[];
    aggregateOnly?: boolean;
    rawRowsPrinted?: boolean;
    rawPiiStored?: boolean;
    sensitiveValuesPrinted?: boolean;
    serviceKeysPrinted?: boolean;
  };
  preconditions?: Record<string, boolean | string>;
  stagingAggregateVerification?: {
    orders?: number;
    backers?: number;
    orderLines?: number;
    excludedBuiltinItems?: number;
    acceptedQuotes?: number;
    acceptedPaymentEvents?: number;
    readyHandoffs?: number;
  };
  syntheticPilotRun?: {
    checkedBy?: string[];
    ordersCompleted?: number;
    exportedPreviewRows?: number;
    excludedBuiltinItems?: number;
    routeTypes?: string[];
    orders?: StagingPilotOrder[];
  };
  mutationBoundary?: Record<string, boolean | string>;
};

const evidencePath = "docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json";
const fixturePath = "fixtures/synthetic-pilot-orders.json";
const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as StagingPilotRunEvidence;
const fixturePlan = createSyntheticPilotImportPlan(readFileSync(fixturePath, "utf8"));
const runbook = readFileSync("docs/runbooks/STAGING_PILOT.md", "utf8");
const checklist = readFileSync("docs/PROJECT_CHECKLIST.md", "utf8");

const expectedOrderKeys = ["pm:pilot-synthetic-ddp-001", "pm:pilot-synthetic-regional-001"];
const expectedRouteTypes = ["CHINA_HK_DIRECT_DDP", "REGIONAL_3PL"];

assert.equal(evidence.provider, "odun-fulfillment-v1");
assert.equal(evidence.status, "completed");
assert.equal(evidence.scope?.ownerApproved, true);
assert.equal(evidence.scope?.mode, "staging_synthetic_allowlisted_order_run");
assert.equal(evidence.scope?.stagingProjectRef, "mgdsvapgltzwhsioccqd");
assert.equal(evidence.scope?.fixture, fixturePath);
assert.deepEqual([...(evidence.scope?.allowlistedSourceOrderKeys ?? [])].sort(), expectedOrderKeys);
assert.equal(evidence.scope?.aggregateOnly, true);
assert.equal(evidence.scope?.rawRowsPrinted, false);
assert.equal(evidence.scope?.rawPiiStored, false);
assert.equal(evidence.scope?.sensitiveValuesPrinted, false);
assert.equal(evidence.scope?.serviceKeysPrinted, false);

assert.equal(evidence.preconditions?.nonPmSupabaseRef, true);
assert.equal(evidence.preconditions?.pmSupabaseBlockedProjectRef, DEFAULT_PM_SUPABASE_BLOCKED_PROJECT_REF);
assert.equal(evidence.preconditions?.liveMutationFlagsDisabled, true);
assert.equal(evidence.preconditions?.stripeMode, "test");
for (const flag of [
  "stripeCheckoutEnabled",
  "providerApiQuotesEnabled",
  "handoffExportsEnabled",
  "partnerApiPushEnabled",
  "sfcMutationsEnabled",
  "easyshipShipmentsEnabled",
  "easyshipTrackingEnabled",
  "pmProductionMutation",
]) {
  assert.equal(evidence.preconditions?.[flag], false, `${flag} must remain disabled for the staging pilot.`);
}

assert.equal(fixturePlan.ok, true);
assert.equal(fixturePlan.fixtureSafe, true);
assert.equal(evidence.stagingAggregateVerification?.orders, fixturePlan.orders);
assert.equal(evidence.stagingAggregateVerification?.backers, 2);
assert.equal(evidence.stagingAggregateVerification?.orderLines, 3);
assert.equal(evidence.stagingAggregateVerification?.excludedBuiltinItems, fixturePlan.excludedBuiltinItems);
assert.equal(evidence.stagingAggregateVerification?.acceptedQuotes, 2);
assert.equal(evidence.stagingAggregateVerification?.acceptedPaymentEvents, 2);
assert.equal(evidence.stagingAggregateVerification?.readyHandoffs, fixturePlan.exportedPreviewRows);

assert.deepEqual([...(evidence.syntheticPilotRun?.checkedBy ?? [])].sort(), [
  "npm run check:staging-prep",
  "npm run test:pilot-dry-run",
]);
assert.equal(evidence.syntheticPilotRun?.ordersCompleted, fixturePlan.orders);
assert.equal(evidence.syntheticPilotRun?.exportedPreviewRows, fixturePlan.exportedPreviewRows);
assert.equal(evidence.syntheticPilotRun?.excludedBuiltinItems, fixturePlan.excludedBuiltinItems);
assert.deepEqual([...(evidence.syntheticPilotRun?.routeTypes ?? [])].sort(), expectedRouteTypes);
assert.equal(evidence.syntheticPilotRun?.orders?.length, 2);
assert.deepEqual([...(evidence.syntheticPilotRun?.orders ?? []).map((order) => order.sourceOrderKey)].sort(), expectedOrderKeys);
assert.ok((evidence.syntheticPilotRun?.orders ?? []).every((order) => order.externalActions === "none"));

assert.equal(evidence.mutationBoundary?.externalActions, "none");
for (const flag of [
  "stagingDbMutationThisPass",
  "liveSupabaseMutation",
  "providerMutation",
  "stripeLiveAction",
  "paymentCapture",
  "labelExportTrackingAction",
  "sfcMutation",
  "easyshipShipmentOrTracking",
  "pmProductionMutation",
  "rawPiiAccess",
]) {
  assert.equal(evidence.mutationBoundary?.[flag], false, `${flag} must be false in pilot evidence.`);
}

assert.match(runbook, /non-PM Supabase project ref `mgdsvapgltzwhsioccqd`/);
assert.match(runbook, /Synthetic pilot fixture was imported into staging with 2 synthetic orders/);
assert.match(checklist, /1-2 allowlisted staging pilot order run completed\. Verified by `docs\/evidence\/STAGING_PILOT_ORDER_RUN_2026-05-15\.json`/);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "staging-pilot-run",
      evidence: evidencePath,
      orders: fixturePlan.orders,
      exportedPreviewRows: fixturePlan.exportedPreviewRows,
      excludedBuiltinItems: fixturePlan.excludedBuiltinItems,
      routeTypes: fixturePlan.routeTypes,
      externalActions: "none",
    },
    null,
    2,
  ),
);
