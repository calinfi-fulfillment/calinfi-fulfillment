import assert from "node:assert/strict";

import {
  buildPackagePlan,
  createSfcFulfillmentVarianceReport,
  createSfcPackingInstructionExport,
  createSfcReferenceNo,
  summarizePackagePlan,
  type BoxCatalogEntry,
  type FulfillmentProductSnapshot,
  type PackagePlanInput,
} from "../src/lib/package-plan";
import { local3plFakeQuoteAdapter } from "../src/lib/route-quote";

const products: FulfillmentProductSnapshot[] = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    productType: "main_box",
    weightGrams: 23000,
    lengthMm: 500,
    widthMm: 500,
    heightMm: 550,
    hsCode: "9503.00",
    countryOfOrigin: "CN",
    customsDescription: "Wood construction toy kit",
    declaredValueCents: 12000,
    declaredValueCurrency: "USD",
    preferredBoxSku: "ODUN_MAIN_BOX",
    capacityUnits: 0,
  },
  {
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    productType: "accessory",
    isBuiltinMainBoxItem: true,
  },
  {
    sku: "CLF-ACC-TOKEN",
    title: "Small Token Add-on",
    productType: "accessory",
    weightGrams: 100,
    lengthMm: 80,
    widthMm: 40,
    heightMm: 20,
    hsCode: "9503.00",
    countryOfOrigin: "CN",
    customsDescription: "Wood game accessory token",
    declaredValueCents: 500,
    declaredValueCurrency: "USD",
    canBundleWithMainBox: true,
    canBundleWithAccessories: true,
    bundleGroup: "small_accessory",
    capacityUnits: 1,
  },
  {
    sku: "CLF-ACC-PIPE",
    title: "Pipe Accessory",
    productType: "accessory",
    weightGrams: 200,
    lengthMm: 160,
    widthMm: 40,
    heightMm: 40,
    hsCode: "9503.00",
    countryOfOrigin: "CN",
    customsDescription: "Wood game pipe accessory",
    declaredValueCents: 600,
    declaredValueCurrency: "USD",
    canBundleWithMainBox: false,
    canBundleWithAccessories: true,
    bundleGroup: "pipes",
    capacityUnits: 1,
  },
];

const boxes: BoxCatalogEntry[] = [
  {
    boxSku: "ODUN_MAIN_BOX",
    sfcBoxSku: "SFC_ODUN_MAIN_BOX",
    title: "ODUN Main Shipper",
    boxType: "main",
    outerLengthMm: 500,
    outerWidthMm: 500,
    outerHeightMm: 550,
    tareWeightGrams: 800,
    maxWeightGrams: 28000,
    maxAccessoryCapacityUnits: 2,
    allowedBundleGroups: ["small_accessory"],
    packagingCostCents: 500,
    currency: "USD",
    readyForDirectShipment: true,
    priority: 10,
  },
  {
    boxSku: "PIPE_BUNDLE_BOX_6",
    sfcBoxSku: "SFC_PIPE_BUNDLE_BOX_6",
    title: "Pipe Bundle Box",
    boxType: "accessory_bundle",
    outerLengthMm: 220,
    outerWidthMm: 120,
    outerHeightMm: 120,
    tareWeightGrams: 200,
    maxWeightGrams: 3000,
    maxAccessoryCapacityUnits: 6,
    allowedBundleGroups: ["pipes"],
    packagingCostCents: 150,
    currency: "USD",
    readyForDirectShipment: true,
    priority: 20,
  },
];

const basePlanInput = {
  orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sourceOrderKey: "pm:package-plan-synthetic",
  catalogVersion: "pm-catalog-2026-05-15",
  packagePlanVersion: "package-rules-1",
  currency: "USD",
  destinationCountryCode: "us",
  products,
  boxes,
  lines: [
    {
      sourceLineKey: "line-core",
      sku: "CLF-ODN-CORE",
      title: "ODUN Core Box",
      quantity: 1,
      lineRole: "reward",
    },
    {
      sourceLineKey: "line-built-in",
      sku: "CLF-ACC-UNI-HND",
      title: "Universal Handle",
      quantity: 1,
      lineRole: "builtin",
      isBuiltinMainBoxItem: true,
    },
    {
      sourceLineKey: "line-token",
      sku: "CLF-ACC-TOKEN",
      title: "Small Token Add-on",
      quantity: 2,
      lineRole: "addon",
    },
    {
      sourceLineKey: "line-pipe",
      sku: "CLF-ACC-PIPE",
      title: "Pipe Accessory",
      quantity: 6,
      lineRole: "addon",
    },
  ],
} satisfies PackagePlanInput;

const plan = buildPackagePlan(basePlanInput);

assert.equal(plan.status, "ready", JSON.stringify(plan.issues, null, 2));
assert.equal(plan.externalActions, "none");
assert.equal(plan.destinationCountryCode, "US");
assert.equal(plan.fingerprint.length, 64);
assert.equal(plan.packageUnits.length, 2);
assert.equal(plan.summary.itemQuantity, 9);
assert.equal(plan.summary.packagingCostCents, 650);
assert.equal(plan.summary.declaredValueCents, 16600);
assert.equal(plan.packageUnits.some((unit) => unit.items.some((item) => item.sku === "CLF-ACC-UNI-HND")), false);

const mainPackage = plan.packageUnits.find((unit) => unit.boxSku === "ODUN_MAIN_BOX");
assert.ok(mainPackage);
assert.deepEqual(
  mainPackage.items.map((item) => `${item.sku}:${item.quantity}`).sort(),
  ["CLF-ACC-TOKEN:2", "CLF-ODN-CORE:1"],
);
assert.equal(mainPackage.totalWeightGrams, 24000);
assert.match(mainPackage.packingInstruction, /SFC_ODUN_MAIN_BOX/);

const pipePackage = plan.packageUnits.find((unit) => unit.boxSku === "PIPE_BUNDLE_BOX_6");
assert.ok(pipePackage);
assert.deepEqual(pipePackage.items.map((item) => `${item.sku}:${item.quantity}`), ["CLF-ACC-PIPE:6"]);
assert.equal(pipePackage.totalWeightGrams, 1400);
assert.equal(pipePackage.customsLines[0]?.declaredValueCents, 3600);

const splitPlan = buildPackagePlan({
  ...basePlanInput,
  lines: [
    {
      sourceLineKey: "line-pipe",
      sku: "CLF-ACC-PIPE",
      title: "Pipe Accessory",
      quantity: 7,
      lineRole: "addon",
    },
  ],
  products,
  boxes,
});

assert.equal(splitPlan.status, "ready");
assert.equal(splitPlan.packageUnits.length, 2);
assert.deepEqual(
  splitPlan.packageUnits.map((unit) => unit.items[0]?.quantity),
  [6, 1],
);

const blockedPlan = buildPackagePlan({
  ...basePlanInput,
  lines: [
    {
      sourceLineKey: "line-missing",
      sku: "CLF-UNKNOWN",
      title: "Unknown Add-on",
      quantity: 1,
      lineRole: "addon",
    },
  ],
  products,
  boxes,
});

assert.equal(blockedPlan.status, "blocked");
assert.equal(blockedPlan.issues.some((issue) => issue.code === "missing_product_master_sku" && issue.severity === "blocker"), true);

const packageUnitQuote = local3plFakeQuoteAdapter.quote({
  orderId: plan.orderId,
  currency: "USD",
  countryCode: "US",
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
  lines: [],
  packageUnits: plan.packageUnits.map((unit) => ({
    packageId: unit.packageId,
    boxSku: unit.boxSku,
    totalWeightGrams: unit.totalWeightGrams,
    outerLengthMm: unit.outerLengthMm,
    outerWidthMm: unit.outerWidthMm,
    outerHeightMm: unit.outerHeightMm,
    packagingCostCents: unit.packagingCostCents,
    declaredValueCents: unit.declaredValueCents,
  })),
  orderFingerprint: plan.fingerprint,
  now: new Date("2026-05-15T00:00:00.000Z"),
});

assert.equal(packageUnitQuote.amountCents, 11240);
assert.equal(packageUnitQuote.bufferCents, 600);
assert.equal(packageUnitQuote.orderFingerprint, plan.fingerprint);

const sfcExport = createSfcPackingInstructionExport(plan);
assert.equal(sfcExport.provider, "sendfromchina");
assert.equal(sfcExport.purpose, "packing_instruction_export");
assert.equal(sfcExport.referenceNo, "pm-package-plan-synthetic");
assert.equal(sfcExport.parcelCount, 2);
assert.equal(sfcExport.rows.length, 2);
assert.equal(sfcExport.rows[0]?.sfcBoxSku, "SFC_ODUN_MAIN_BOX");
assert.equal(sfcExport.rows[1]?.sfcBoxSku, "SFC_PIPE_BUNDLE_BOX_6");
assert.match(sfcExport.orderNote, /ODUN_PACKAGE_PLAN/);
assert.match(sfcExport.orderNote, /final-measure parcels/);
assert.match(sfcExport.csv, /packingInstruction/);
assert.match(sfcExport.csv, /SFC_PIPE_BUNDLE_BOX_6/);
assert.equal(sfcExport.mutation, false);
assert.equal(sfcExport.containsBackerPii, false);
assert.equal(sfcExport.externalActions, "none");
assert.equal(JSON.stringify(sfcExport).includes("Seattle"), false);
assert.equal(JSON.stringify(sfcExport).includes("98101"), false);
assert.equal(createSfcReferenceNo("pm:very-long-synthetic-order-key-that-exceeds-sfc-reference-limit").length <= 32, true);

const sfcVarianceReport = createSfcFulfillmentVarianceReport({
  plan,
  quote: packageUnitQuote,
  snapshot: {
    provider: "sendfromchina",
    sourceOrderKey: plan.sourceOrderKey,
    referenceNo: sfcExport.referenceNo,
    packagePlanFingerprint: plan.fingerprint,
    capturedAtIso: "2026-05-15T10:00:00.000Z",
    estimate: {
      channelName: "SFC synthetic DDP channel",
      methodCode: "SFC-DDP-SYNTH",
      estimatedShippingFeeCents: packageUnitQuote.totalCents - 160,
      currency: packageUnitQuote.currency,
      matchedAtIso: "2026-05-15T10:05:00.000Z",
    },
    actual: {
      finalShippingFeeCents: packageUnitQuote.totalCents - 80,
      currency: packageUnitQuote.currency,
      measuredAtIso: "2026-05-15T14:00:00.000Z",
      parcels: plan.packageUnits.map((unit, index) => ({
        packageId: unit.packageId,
        parcelNo: index + 1,
        trackingNumber: `SFC-SYNTH-${String(index + 1).padStart(4, "0")}`,
        actualWeightGrams: unit.totalWeightGrams + (index === 0 ? 250 : 30),
        outerLengthMm: unit.outerLengthMm + (index === 0 ? 0 : 1),
        outerWidthMm: unit.outerWidthMm,
        outerHeightMm: unit.outerHeightMm + 2,
      })),
    },
    mutation: false,
    containsBackerPii: false,
    externalActions: "none",
  },
});

assert.equal(sfcVarianceReport.provider, "sendfromchina");
assert.equal(sfcVarianceReport.status, "final_captured");
assert.equal(sfcVarianceReport.summary.quoteToEstimateDeltaCents, -160);
assert.equal(sfcVarianceReport.summary.estimateToFinalDeltaCents, 80);
assert.equal(sfcVarianceReport.summary.quoteToFinalDeltaCents, -80);
assert.equal(sfcVarianceReport.summary.packageCountDelta, 0);
assert.equal(sfcVarianceReport.summary.weightDeltaGrams, 280);
assert.equal(sfcVarianceReport.summary.trackingCount, 2);
assert.equal(sfcVarianceReport.summary.missingTrackingCount, 0);
assert.equal(sfcVarianceReport.packageRows.every((row) => row.status === "matched"), true);
assert.equal(sfcVarianceReport.issues.length, 0);
assert.equal(sfcVarianceReport.mutation, false);
assert.equal(sfcVarianceReport.containsBackerPii, false);
assert.equal(sfcVarianceReport.externalActions, "none");
assert.equal(JSON.stringify(sfcVarianceReport).includes("Seattle"), false);
assert.equal(JSON.stringify(sfcVarianceReport).includes("98101"), false);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "package-plan",
      summary: summarizePackagePlan(plan),
      splitPackageCount: splitPlan.packageUnits.length,
      blockedIssueCount: blockedPlan.issues.length,
      packageUnitQuoteTotalCents: packageUnitQuote.totalCents,
      sfcExportRows: sfcExport.rows.length,
      sfcVarianceStatus: sfcVarianceReport.status,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
