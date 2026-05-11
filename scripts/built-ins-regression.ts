import assert from "node:assert/strict";

import { buildPmIntakePlan } from "../src/lib/pm-intake/processor";
import type { PmIntakePayload } from "../src/lib/pm-intake/schema";

const payload: PmIntakePayload = {
  pledgeId: "33333333-3333-4333-8333-333333333333",
  orderStatus: "selection_submitted",
  addressStatus: "complete",
  backer: {
    sourceBackerKey: "pm:backer:synthetic-built-in",
  },
  recipientSnapshot: { countryCode: "US" },
  orderSnapshot: {},
  lines: [
    {
      lineRole: "reward",
      rewardCode: "ODUN_CORE",
      sku: "CLF-ODN-CORE",
      title: "ODUN Core Box",
      quantity: 1,
    },
    {
      lineRole: "builtin",
      rewardCode: "ODUN_CORE",
      sku: "CLF-ACC-UNI-HND",
      title: "Universal Handle",
      quantity: 1,
    },
    {
      lineRole: "addon",
      addOnId: "addon-missing",
      sku: "CLF-UNKNOWN-SKU",
      title: "Unknown Add-on",
      quantity: 1,
    },
  ],
};

const plan = buildPmIntakePlan(payload, [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready",
  },
  {
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    readinessStatus: "ready",
    isBuiltinMainBoxItem: true,
  },
]);

const builtinLine = plan.orderLines.find((line) => line.sku === "CLF-ACC-UNI-HND");

assert.ok(builtinLine);
assert.equal(builtinLine.isVisible, true);
assert.equal(builtinLine.isBuiltinMainBoxItem, true);
assert.equal(builtinLine.isPhysical, false);
assert.deepEqual(plan.excludedBuiltinItems, [
  {
    sourceLineKey: builtinLine.sourceLineKey,
    sku: "CLF-ACC-UNI-HND",
    quantity: 1,
    exclusionReason: "built_in_main_box_item",
  },
]);
assert.equal(plan.blocked, true);
assert.equal(plan.issues.some((issue) => issue.code === "missing_product_master_sku" && issue.sku === "CLF-UNKNOWN-SKU"), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "built-ins-and-missing-sku",
      excludedBuiltinCount: plan.excludedBuiltinItems.length,
      blockerCount: plan.issues.filter((issue) => issue.severity === "blocker").length,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
