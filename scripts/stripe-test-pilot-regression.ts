import assert from "node:assert/strict";

import { runSyntheticStripeTestPilot } from "../src/lib/stripe-test-pilot";

async function main() {
  const pilot = await runSyntheticStripeTestPilot();

  assert.equal(pilot.ok, true);

  if (!pilot.ok) {
    throw new Error("Synthetic Stripe test pilot failed.");
  }

  assert.equal(pilot.lockStatus, "locked_for_fulfillment");
  assert.equal(pilot.externalCalls, "mocked");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: "stripe-test-pilot",
        checkoutSession: pilot.checkoutSessionId,
        lockStatus: pilot.lockStatus,
        externalCalls: pilot.externalCalls,
      },
      null,
      2,
    ),
  );
}

main();
