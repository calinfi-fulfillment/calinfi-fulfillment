import assert from "node:assert/strict";

import { productReadinessCockpitQueue } from "../src/lib/ops-cockpit";
import { evaluateProductReadiness, summarizeProductReadiness } from "../src/lib/product-readiness";

const ready = evaluateProductReadiness({
  sku: "CLF-ODN-CORE",
  title: "ODUN Core Box",
  readinessStatus: "ready",
  weightGrams: 1200,
  lengthMm: 320,
  widthMm: 220,
  heightMm: 120,
  hsCode: "9503.00",
  countryOfOrigin: "CN",
  customsDescription: "Wood construction toy kit",
  declaredValueCents: 12000,
  declaredValueCurrency: "USD",
});

assert.equal(ready.status, "ready");
assert.deepEqual(ready.issues, []);

const needsReview = evaluateProductReadiness({
  sku: "CLF-ACC-STAND",
  title: "Display Stand",
  readinessStatus: "ready",
});

assert.equal(needsReview.status, "needs_review");
assert.equal(needsReview.issues.some((issue) => issue.code === "missing_packaging_field"), true);
assert.equal(needsReview.issues.every((issue) => issue.severity === "warning"), true);

const ddpBlocked = evaluateProductReadiness(
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Add-on",
    readinessStatus: "ready",
    weightGrams: 200,
    lengthMm: 120,
    widthMm: 80,
    heightMm: 40,
  },
  { routeType: "CHINA_HK_DIRECT_DDP" },
);

assert.equal(ddpBlocked.status, "blocked");
assert.equal(ddpBlocked.issues.some((issue) => issue.code === "missing_ddp_customs_field"), true);
assert.equal(ddpBlocked.issues.some((issue) => issue.severity === "blocker"), true);

const builtin = evaluateProductReadiness({
  sku: "CLF-ACC-UNI-HND",
  title: "Universal Handle",
  readinessStatus: "ready",
  isBuiltinMainBoxItem: true,
});

assert.equal(builtin.status, "ready");
assert.deepEqual(builtin.issues, []);

assert.deepEqual(summarizeProductReadiness([ready, needsReview, ddpBlocked, builtin]), {
  ready: 2,
  needsReview: 1,
  blocked: 1,
});
assert.deepEqual(productReadinessCockpitQueue([ready, needsReview, ddpBlocked, builtin]).summary, {
  ready: 2,
  needsReview: 1,
  blocked: 1,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "product-readiness",
      summary: summarizeProductReadiness([ready, needsReview, ddpBlocked, builtin]),
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
