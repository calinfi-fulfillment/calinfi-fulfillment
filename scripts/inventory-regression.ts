import assert from "node:assert/strict";

import {
  buildFulfillmentStockFeed,
  buildInventoryAvailability,
  fulfillmentDemandFixtures,
  inventorySupplyFixtures,
  summarizeInventoryAvailability,
} from "../src/lib/inventory";

const availability = buildInventoryAvailability(inventorySupplyFixtures, fulfillmentDemandFixtures);
const summary = summarizeInventoryAvailability(availability);
const feed = buildFulfillmentStockFeed(availability);

const core = availability.find((line) => line.sku === "CLF-ODN-CORE");
assert.ok(core);
assert.equal(core.producedQuantity, 144);
assert.equal(core.onHandQuantity, 92);
assert.equal(core.reservedQuantity, 22);
assert.equal(core.availableQuantity, 64);
assert.equal(core.demandQuantity, 46);
assert.equal(core.shortageQuantity, 0);
assert.equal(core.originalAmountCents, 2985400);
assert.equal(core.currentAmountCents, 2985400);
assert.equal(core.amountDeltaCents, 0);
assert.equal(core.status, "feed_ready");

const stand = availability.find((line) => line.sku === "CLF-ACC-STAND");
assert.ok(stand);
assert.equal(stand.availableQuantity, 8);
assert.equal(stand.demandQuantity, 32);
assert.equal(stand.shortageQuantity, 24);
assert.equal(stand.originalAmountCents, 0);
assert.equal(stand.currentAmountCents, 252800);
assert.equal(stand.amountDeltaCents, 252800);
assert.equal(stand.status, "incoming");

const ddp = availability.find((line) => line.sku === "CLF-ACC-DDP");
assert.ok(ddp);
assert.equal(ddp.availableQuantity, 0);
assert.equal(ddp.demandQuantity, 12);
assert.equal(ddp.shortageQuantity, 12);
assert.equal(ddp.amountDeltaCents, 142800);
assert.equal(ddp.status, "short");

const builtin = availability.find((line) => line.sku === "CLF-ACC-UNI-HND");
assert.ok(builtin);
assert.equal(builtin.demandQuantity, 0);
assert.equal(feed.some((line) => line.sku === "CLF-ACC-UNI-HND"), false);

assert.equal(summary.totalProduced, 360);
assert.equal(summary.totalDemand, 90);
assert.equal(summary.totalReservable, 54);
assert.equal(summary.totalShortage, 36);
assert.equal(summary.totalOriginalAmountCents, 2985400);
assert.equal(summary.totalCurrentAmountCents, 3381000);
assert.equal(summary.totalAmountDeltaCents, 395600);
assert.equal(summary.externalActions, "none");
assert.deepEqual(
  feed.map((line) => ({ sku: line.sku, reservableQuantity: line.reservableQuantity, externalActions: line.externalActions })),
  [
    { sku: "CLF-ACC-STAND", reservableQuantity: 8, externalActions: "none" },
    { sku: "CLF-ACC-DDP", reservableQuantity: 0, externalActions: "none" },
    { sku: "CLF-ODN-CORE", reservableQuantity: 46, externalActions: "none" },
  ],
);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "inventory",
      skuCount: availability.length,
      feedSkuCount: feed.length,
      totalShortage: summary.totalShortage,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
