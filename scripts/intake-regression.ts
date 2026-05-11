import assert from "node:assert/strict";

import { buildPmIntakePlan } from "../src/lib/pm-intake/processor";
import { PmIntakePayloadSchema, type PmIntakePayload } from "../src/lib/pm-intake/schema";
import { signPmIntakePayload, verifyPmIntakeSignature } from "../src/lib/pm-intake/signature";

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
  ],
};

const rawBody = JSON.stringify(payload);
const signature = signPmIntakePayload(rawBody, "synthetic-secret");

assert.equal(verifyPmIntakeSignature(rawBody, signature, "synthetic-secret"), true);
assert.equal(verifyPmIntakeSignature(rawBody, signature, "wrong-secret"), false);

const parsed = PmIntakePayloadSchema.parse(payload);
const plan = buildPmIntakePlan(parsed, [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready",
  },
  {
    sku: "CLF-ACC-STAND",
    title: "Display Stand",
    readinessStatus: "ready",
  },
]);
const repeatPlan = buildPmIntakePlan(parsed, [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready",
  },
  {
    sku: "CLF-ACC-STAND",
    title: "Display Stand",
    readinessStatus: "ready",
  },
]);

assert.equal(plan.sourceOrderKey, `pm:${payload.pledgeId}`);
assert.equal(plan.sourceBackerKey, "pm:backer:synthetic-001");
assert.deepEqual(
  plan.orderLines.map((line) => line.sourceLineKey),
  repeatPlan.orderLines.map((line) => line.sourceLineKey),
);
assert.deepEqual(plan.issues, []);
assert.equal(plan.blocked, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "pm-intake",
      sourceOrderKey: plan.sourceOrderKey,
      lineCount: plan.orderLines.length,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
