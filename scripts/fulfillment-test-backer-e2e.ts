import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

import {
  applyPmIntakePersistencePlanToSyntheticStore,
  buildPmIntakePersistencePlan,
  createEmptySyntheticPmIntakeStore,
  summarizePmIntakePersistencePlan,
  type PmIntakePersistenceProduct,
} from "../src/lib/pm-intake/persistence";
import { signPmIntakePayload } from "../src/lib/pm-intake/signature";
import type { PmIntakePayload } from "../src/lib/pm-intake/schema";
import {
  buildFulfillmentStockFeed,
  buildInventoryAvailability,
  summarizeInventoryAvailability,
  type FulfillmentDemandInput,
  type InventorySupplyInput,
} from "../src/lib/inventory";
import {
  buildPackagePlan,
  createSfcPackingInstructionExport,
  summarizePackagePlan,
  type BoxCatalogEntry,
  type FulfillmentProductSnapshot,
} from "../src/lib/package-plan";
import { processPaymentEvent, type PaymentEventPayload } from "../src/lib/payment-events";
import { evaluateProductReadiness, summarizeProductReadiness } from "../src/lib/product-readiness";
import { mockFulfillmentProviderAdapter } from "../src/lib/provider-adapter";
import {
  local3plFakeQuoteAdapter,
  resolveRoute,
  type RouteRule,
} from "../src/lib/route-quote";
import { createHandoffPreview, exportHandoffRows } from "../src/lib/handoff";
import {
  assertPiiSafeAggregateOutput,
  buildExceptionAgingReport,
  buildFulfillmentSummaryReport,
  buildRoutePerformanceSummary,
} from "../src/lib/reports";
import { loadLocalEnvFile } from "./load-local-env";

type TestProduct = PmIntakePersistenceProduct & FulfillmentProductSnapshot;

loadLocalEnvFile();

const now = new Date("2026-05-16T00:00:00.000Z");
const evidencePath = "/tmp/odun-fulfillment-test-backer-e2e.json";
const sharedSecret = process.env.PM_INTAKE_SHARED_SECRET || "synthetic-local-intake-secret";
const localBaseUrl = process.env.FULFILLMENT_TEST_BASE_URL || "http://127.0.0.1:3105";

const products: TestProduct[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready",
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
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    readinessStatus: "ready",
    productType: "accessory",
    isBuiltinMainBoxItem: true,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    sku: "CLF-ACC-TOKEN",
    title: "Small Token Add-on",
    readinessStatus: "ready",
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
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    sku: "CLF-ACC-PIPE",
    title: "Pipe Accessory",
    readinessStatus: "ready",
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

const routeRules: RouteRule[] = [
  {
    ruleName: "test-backer-us-regional",
    countryCode: "US",
    routeType: "REGIONAL_3PL",
    shippingMode: "3PL_INTERNAL_LABEL",
    priority: 10,
    enabled: true,
  },
];

const intakePayload: PmIntakePayload = {
  pledgeId: "77777777-7777-4777-8777-777777777777",
  orderNumber: "ODUN-TEST-BACKER-001",
  orderStatus: "selection_submitted",
  addressStatus: "complete",
  backer: {
    pmBackerId: "88888888-8888-4888-8888-888888888888",
    sourceBackerKey: "pm:test-backer:local-e2e-001",
    backerNumber: "TEST-BACKER-001",
  },
  recipientSnapshot: { countryCode: "US", regionCode: "US-WEST" },
  orderSnapshot: { source: "local-fulfillment-test-backer-e2e" },
  lines: [
    {
      lineRole: "reward",
      rewardCode: "ODUN_CORE",
      sku: "CLF-ODN-CORE",
      title: "ODUN Core Box",
      quantity: 1,
      unitValueCents: 12000,
      unitValueCurrency: "USD",
    },
    {
      lineRole: "addon",
      addOnId: "addon-token",
      sku: "CLF-ACC-TOKEN",
      title: "Small Token Add-on",
      quantity: 2,
      unitValueCents: 500,
      unitValueCurrency: "USD",
    },
    {
      lineRole: "addon",
      addOnId: "addon-pipe",
      sku: "CLF-ACC-PIPE",
      title: "Pipe Accessory",
      quantity: 6,
      unitValueCents: 600,
      unitValueCurrency: "USD",
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

async function postLocalIntakeContract() {
  const rawBody = JSON.stringify(intakePayload);
  const signature = signPmIntakePayload(rawBody, sharedSecret);

  try {
    const response = await fetch(`${localBaseUrl}/api/pm/intake`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-odun-signature": signature,
      },
      body: rawBody,
    });
    const body = (await response.json().catch(() => null)) as { code?: string; ok?: boolean } | null;

    return {
      reached: true,
      status: response.status,
      code: body?.code ?? "unknown_response",
      ok: Boolean(body?.ok),
    };
  } catch (error) {
    return {
      reached: false,
      status: 0,
      code: "server_unavailable",
      ok: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

function demandFromIntake(lines: ReturnType<typeof applyPmIntakePersistencePlanToSyntheticStore>["orderLines"], routeType: "REGIONAL_3PL") {
  return lines
    .filter((line) => line.is_physical)
    .map((line) => ({
      sourceOrderKey: "pm:77777777-7777-4777-8777-777777777777",
      sourceLineKey: line.source_line_key,
      sku: line.sku,
      title: line.title,
      quantity: line.quantity,
      lineRole: line.line_role,
      orderStatus: "selection_submitted",
      routeType,
      originalUnitAmountCents: line.unit_value_cents ?? 0,
      currentUnitAmountCents: line.unit_value_cents ?? 0,
      currency: line.unit_value_currency ?? "USD",
    })) satisfies FulfillmentDemandInput[];
}

const supply: InventorySupplyInput[] = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    locationCode: "SFC-CN-01",
    locationName: "SFC China Hub",
    locationType: "sfc_warehouse",
    batchCode: "TEST-CORE-B01",
    status: "received",
    plannedQuantity: 10,
    producedQuantity: 10,
    receivedQuantity: 10,
    onHandQuantity: 3,
    reservedQuantity: 0,
  },
  {
    sku: "CLF-ACC-TOKEN",
    title: "Small Token Add-on",
    locationCode: "SFC-CN-01",
    locationName: "SFC China Hub",
    locationType: "sfc_warehouse",
    batchCode: "TEST-TOKEN-B01",
    status: "received",
    plannedQuantity: 20,
    producedQuantity: 20,
    receivedQuantity: 20,
    onHandQuantity: 10,
    reservedQuantity: 0,
  },
  {
    sku: "CLF-ACC-PIPE",
    title: "Pipe Accessory",
    locationCode: "SFC-CN-01",
    locationName: "SFC China Hub",
    locationType: "sfc_warehouse",
    batchCode: "TEST-PIPE-B01",
    status: "received",
    plannedQuantity: 20,
    producedQuantity: 20,
    receivedQuantity: 20,
    onHandQuantity: 10,
    reservedQuantity: 0,
  },
];

async function main() {
  const apiContract = await postLocalIntakeContract();
  assert.equal(apiContract.reached, true, "Local Fulfillment dev server must be running for the API contract check.");
  assert.ok(
    apiContract.status === 200 || apiContract.code === "persistence_not_enabled",
    `Unexpected intake API response: ${JSON.stringify(apiContract)}`,
  );

  const route = resolveRoute({ countryCode: "US", regionCode: "US-WEST" }, routeRules);
  assert.equal(route.routeType, "REGIONAL_3PL");
  assert.equal(route.shippingMode, "3PL_INTERNAL_LABEL");

  const readiness = products
    .filter((product) => !product.isBuiltinMainBoxItem)
    .map((product) => evaluateProductReadiness(product, { routeType: route.routeType }));
  const readinessSummary = summarizeProductReadiness(readiness);
  assert.equal(readinessSummary.blocked, 0);

  const persistencePlan = buildPmIntakePersistencePlan(intakePayload, {
    products,
    now: now.toISOString(),
  });
  const persistenceSummary = summarizePmIntakePersistencePlan(persistencePlan);
  assert.equal(persistencePlan.blocked, false, JSON.stringify(persistencePlan.issues, null, 2));
  assert.equal(persistenceSummary.orderLineCount, 4);
  assert.equal(persistenceSummary.excludedBuiltinItemCount, 1);

  const syntheticStore = applyPmIntakePersistencePlanToSyntheticStore(
    createEmptySyntheticPmIntakeStore(),
    persistencePlan,
  );
  assert.equal(syntheticStore.backers.length, 1);
  assert.equal(syntheticStore.orders.length, 1);
  assert.equal(syntheticStore.orderLines.length, 4);
  assert.equal(syntheticStore.excludedBuiltinItems.length, 1);

  const order = syntheticStore.orders[0]!;
  const availability = buildInventoryAvailability(supply, demandFromIntake(syntheticStore.orderLines, route.routeType));
  const inventorySummary = summarizeInventoryAvailability(availability);
  const stockFeed = buildFulfillmentStockFeed(availability);
  assert.equal(inventorySummary.totalShortage, 0);
  assert.equal(stockFeed.length, 3);

  const packagePlan = buildPackagePlan({
    orderId: order.id,
    sourceOrderKey: order.source_order_key,
    catalogVersion: "local-test-catalog-2026-05-16",
    packagePlanVersion: "package-rules-test-backer-1",
    currency: "USD",
    destinationCountryCode: "US",
    products,
    boxes,
    lines: syntheticStore.orderLines.map((line) => ({
      sourceLineKey: line.source_line_key,
      sku: line.sku,
      title: line.title,
      quantity: line.quantity,
      lineRole: line.line_role,
      isBuiltinMainBoxItem: line.is_builtin_main_box_item,
    })),
  });
  assert.equal(packagePlan.status, "ready", JSON.stringify(packagePlan.issues, null, 2));
  assert.equal(packagePlan.packageUnits.length, 2);
  assert.equal(packagePlan.externalActions, "none");
  assert.equal(packagePlan.packageUnits.some((unit) => unit.items.some((item) => item.sku === "CLF-ACC-UNI-HND")), false);

  const sfcExport = createSfcPackingInstructionExport(packagePlan);
  assert.equal(sfcExport.rows.length, 2);
  assert.equal(sfcExport.mutation, false);
  assert.equal(sfcExport.containsBackerPii, false);
  assert.equal(sfcExport.externalActions, "none");

  const quote = local3plFakeQuoteAdapter.quote({
    orderId: order.id,
    currency: "USD",
    countryCode: "US",
    routeType: route.routeType,
    shippingMode: route.shippingMode,
    lines: [],
    packageUnits: packagePlan.packageUnits.map((unit) => ({
      packageId: unit.packageId,
      boxSku: unit.boxSku,
      totalWeightGrams: unit.totalWeightGrams,
      outerLengthMm: unit.outerLengthMm,
      outerWidthMm: unit.outerWidthMm,
      outerHeightMm: unit.outerHeightMm,
      packagingCostCents: unit.packagingCostCents,
      declaredValueCents: unit.declaredValueCents,
    })),
    orderFingerprint: packagePlan.fingerprint,
    now,
  });
  assert.equal(quote.provider, "local_3pl_fake");
  assert.equal(quote.status, "ready");
  assert.ok(quote.totalCents > 0);

  const seenEventKeys = new Set<string>();
  const paymentPayload: PaymentEventPayload = {
    eventId: "evt_test_backer_local_e2e_001",
    eventType: "stripe.checkout.session.completed",
    orderId: quote.orderId,
    quoteId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    sourceOrderKey: order.source_order_key,
    amountCents: quote.totalCents,
    currency: quote.currency,
    orderStatusBefore: "payment_pending",
    decisionStatusBefore: "payment_pending",
    quote: {
      ...quote,
      expiresAt: quote.expiresAt.toISOString(),
    },
    currentOrderFingerprint: packagePlan.fingerprint,
    now: now.toISOString(),
  };
  const payment = processPaymentEvent(paymentPayload, { seenEventKeys });
  assert.equal(payment.eventStatus, "accepted");
  assert.equal(payment.lockApplied, true);
  assert.equal(payment.orderStatus, "locked_for_fulfillment");
  assert.equal(payment.decisionStatus, "paid_locked");

  const exportCandidate = {
    orderId: order.id,
    sourceOrderKey: order.source_order_key,
    orderStatus: payment.orderStatus,
    decisionStatus: payment.decisionStatus,
    paymentStatus: "completed" as const,
    routeType: route.routeType,
    shippingMode: route.shippingMode,
  };
  const handoffPreview = createHandoffPreview([exportCandidate]);
  const handoffRows = exportHandoffRows(handoffPreview);
  assert.equal(handoffRows.length, 1);

  const providerHealth = mockFulfillmentProviderAdapter.healthCheck?.({
    FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
    FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
  });
  assert.equal(providerHealth?.ok, true);
  const providerHandoff = mockFulfillmentProviderAdapter.createHandoff?.({
    orderId: order.id,
    sourceOrderKey: order.source_order_key,
    routeType: route.routeType,
    shippingMode: route.shippingMode,
    idempotencyKey: `test-backer:${order.source_order_key}`,
  });
  assert.equal(providerHandoff?.externalActions, "none");
  assert.equal(providerHandoff?.status, "mock_created");
  const tracking = mockFulfillmentProviderAdapter.getTracking?.({
    providerHandoffId: providerHandoff!.providerHandoffId,
  });
  assert.equal(tracking?.status, "label_pending");
  assert.equal(tracking?.externalActions, "none");

  const fulfillmentReport = buildFulfillmentSummaryReport({
    orders: [
      {
        orderStatus: payment.orderStatus,
        paymentStatus: "completed",
        routeType: route.routeType,
      },
    ],
    handoffs: [
      {
        routeType: route.routeType,
        status: handoffRows[0]!.status,
        exportedAt: now,
      },
    ],
    exceptions: [],
  });
  const routePerformance = buildRoutePerformanceSummary([
    {
      routeType: route.routeType,
      status: handoffRows[0]!.status,
      exportedAt: now,
    },
  ]);
  const exceptionAging = buildExceptionAgingReport([], now);
  assert.equal(assertPiiSafeAggregateOutput({ fulfillmentReport, routePerformance, exceptionAging }), true);

  const evidence = {
    ok: true,
    checked: "fulfillment-test-backer-e2e",
    mode: "local-synthetic-only",
    testBacker: {
      backerNumber: intakePayload.backer.backerNumber,
      sourceBackerKey: intakePayload.backer.sourceBackerKey,
      rawPiiStored: false,
    },
    apiContract,
    intake: {
      sourceOrderKey: persistenceSummary.sourceOrderKey,
      plannedTables: persistenceSummary.plannedTables,
      orderLineCount: persistenceSummary.orderLineCount,
      excludedBuiltinItemCount: persistenceSummary.excludedBuiltinItemCount,
    },
    route,
    productReadiness: readinessSummary,
    inventory: {
      totalDemand: inventorySummary.totalDemand,
      totalReservable: inventorySummary.totalReservable,
      totalShortage: inventorySummary.totalShortage,
      feedSkuCount: stockFeed.length,
      externalActions: inventorySummary.externalActions,
    },
    packagePlan: {
      ...summarizePackagePlan(packagePlan),
      sfcExportRows: sfcExport.rows.length,
      sfcMutation: sfcExport.mutation,
      containsBackerPii: sfcExport.containsBackerPii,
    },
    quote: {
      provider: quote.provider,
      status: quote.status,
      totalCents: quote.totalCents,
      expiresAt: quote.expiresAt.toISOString(),
    },
    payment: {
      eventStatus: payment.eventStatus,
      lockApplied: payment.lockApplied,
      orderStatus: payment.orderStatus,
      decisionStatus: payment.decisionStatus,
    },
    handoff: {
      exportReady: handoffPreview[0]?.exportReady,
      exportedRows: handoffRows.length,
      provider: providerHandoff?.provider,
      providerStatus: providerHandoff?.status,
      trackingStatus: tracking?.status,
      externalActions: providerHandoff?.externalActions,
    },
    reports: {
      fulfillmentReport,
      routePerformance,
      exceptionAging,
      piiSafeAggregate: true,
    },
    externalActions: "none",
    productionActions: "none",
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
