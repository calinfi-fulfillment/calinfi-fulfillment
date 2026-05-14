import assert from "node:assert/strict";

import { buildRegionalEasyshipRatePlan } from "../src/lib/easyship";
import { createFreightBatchPlan, createLandedCostPreview, resolveNetworkRoute } from "../src/lib/network-plan";
import { createOrderQuoteFingerprint } from "../src/lib/route-quote";
import {
  buildSfcCreateAsnPreviewPlan,
  buildSfcCreateOrderPreviewPlan,
  buildSfcGetShippingMethodPlan,
  buildSfcGetWarehousePlan,
  buildSfcRatePlan,
  buildSfcRatesEstimatePlan,
  buildSfcStockPlan,
  hydrateSfcRequestBodyForExecution,
  createSfcAgreementBrief,
  createSfcReadOnlySmokePlan,
  createSfcProductSyncLine,
  createSfcProductSyncPreview,
  createSfcReadiness,
  summarizeSfcReadOnlyResponse,
} from "../src/lib/sfc";

const usRoute = resolveNetworkRoute({ countryCode: "us" });
assert.equal(usRoute.routeFamily, "SFC_TO_US_FREIGHT_EASYSHIP");
assert.equal(usRoute.originNode, "SFC_CHINA");
assert.equal(usRoute.regionalNode, "US_3PL");
assert.equal(usRoute.routeType, "REGIONAL_3PL");
assert.equal(usRoute.shippingMode, "3PL_INTERNAL_LABEL");
assert.equal(usRoute.freightLegProvider, "sendfromchina");
assert.equal(usRoute.lastMileProvider, "easyship");
assert.equal(usRoute.requiresRegionalFreight, true);
assert.equal(usRoute.sendsBackerPiiToSfc, false);

const euRoute = resolveNetworkRoute({ countryCode: "DE" });
assert.equal(euRoute.routeFamily, "SFC_TO_EU_FREIGHT_EASYSHIP");
assert.equal(euRoute.regionalNode, "EU_3PL");
assert.equal(euRoute.sendsBackerPiiToSfc, false);

const asiaRoute = resolveNetworkRoute({ countryCode: "HK" });
assert.equal(asiaRoute.routeFamily, "SFC_ASIA_DIRECT_DDP");
assert.equal(asiaRoute.routeType, "CHINA_HK_DIRECT_DDP");
assert.equal(asiaRoute.shippingMode, "DIRECT_DDP_PROVIDER");
assert.equal(asiaRoute.regionalNode, "SFC_DIRECT");
assert.equal(asiaRoute.lastMileProvider, "sendfromchina");
assert.equal(asiaRoute.requiresRegionalFreight, false);
assert.equal(asiaRoute.sendsBackerPiiToSfc, true);

const manualRoute = resolveNetworkRoute({ countryCode: "BR" });
assert.equal(manualRoute.routeFamily, "MANUAL_SPECIAL");
assert.equal(manualRoute.freightLegProvider, "manual");
assert.equal(manualRoute.lastMileProvider, "manual");
assert.equal(manualRoute.sendsBackerPiiToSfc, false);

const agreementBrief = createSfcAgreementBrief();
assert.deepEqual(agreementBrief.readOnlyActions, [
  "getWarehouse",
  "getShippingMethod",
  "getStockBySKU",
  "getRate",
  "getRateByMode",
  "getRates",
]);
assert.equal(agreementBrief.requiredItems.some((item) => item.id === "credentials"), true);
assert.equal(agreementBrief.requiredItems.some((item) => item.id === "mutations" && item.status === "later"), true);
assert.equal(agreementBrief.mutationBoundary.some((item) => item.includes("createOrder")), true);
assert.equal(JSON.stringify(agreementBrief).includes("SFC_APP_TOKEN="), false);

const landedCost = createLandedCostPreview({
  routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP",
  currency: "USD",
  orderChargeableWeightKg: 1.2,
  batchChargeableWeightKg: 120,
  bulkFreightCents: 42000,
  importDutyCents: 450,
  regionalReceivingCents: 275,
  regionalHandlingCents: 325,
  easyshipLastMileCents: 2480,
});
assert.equal(landedCost.externalActions, "none");
assert.equal(landedCost.freightShareRatio, 0.01);
assert.equal(landedCost.components[0]?.cents, 420);
assert.equal(landedCost.subtotalCents, 3950);
assert.equal(landedCost.bufferCents, 300);
assert.equal(landedCost.totalCents, 4250);

const freightBatchPlan = createFreightBatchPlan([
  {
    sourceOrderKey: "pm:synthetic-order-001",
    routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP",
    regionalNode: "US_3PL",
    sku: "CLF-ODN-CORE",
    quantity: 1,
    unitWeightKg: 1.2,
    unitVolumeCbm: 0.008,
  },
  {
    sourceOrderKey: "pm:synthetic-order-003",
    routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP",
    regionalNode: "US_3PL",
    sku: "CLF-ACC-STAND",
    quantity: 2,
    unitWeightKg: 0.18,
    unitVolumeCbm: 0.001,
  },
  {
    sourceOrderKey: "pm:synthetic-eu-001",
    routeFamily: "SFC_TO_EU_FREIGHT_EASYSHIP",
    regionalNode: "EU_3PL",
    sku: "CLF-ODN-CORE",
    quantity: 1,
    unitWeightKg: 1.2,
    unitVolumeCbm: 0.008,
  },
  {
    sourceOrderKey: "pm:bad-node",
    routeFamily: "SFC_TO_EU_FREIGHT_EASYSHIP",
    regionalNode: "US_3PL",
    sku: "CLF-ODN-CORE",
    quantity: 1,
    unitWeightKg: 1.2,
    unitVolumeCbm: 0.008,
  },
]);
assert.equal(freightBatchPlan.externalActions, "none");
assert.equal(freightBatchPlan.rejectedLines.length, 1);
assert.equal(freightBatchPlan.rejectedLines[0]?.sourceOrderKey, "pm:bad-node");
assert.equal(freightBatchPlan.batches.length, 2);
const usFreightBatch = freightBatchPlan.batches.find((batch) => batch.regionalNode === "US_3PL");
assert.equal(usFreightBatch?.containsBackerPii, false);
assert.equal(usFreightBatch?.externalActions, "none");
assert.equal(usFreightBatch?.orderCount, 2);
assert.equal(usFreightBatch?.totalQuantity, 3);
assert.equal(usFreightBatch?.totalWeightKg, 1.56);
assert.equal(usFreightBatch?.totalVolumeCbm, 0.01);
assert.deepEqual(usFreightBatch?.sourceOrderKeys, ["pm:synthetic-order-001", "pm:synthetic-order-003"]);
assert.deepEqual(usFreightBatch?.manifestLines.map((line) => [line.sku, line.quantity]), [
  ["CLF-ACC-STAND", 2],
  ["CLF-ODN-CORE", 1],
]);
assert.equal(JSON.stringify(freightBatchPlan).includes("Seattle"), false);
assert.equal(JSON.stringify(freightBatchPlan).includes("Berlin"), false);

const sourceOrderKey = "pm:sfc-network";
const quoteRequest = {
  orderId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  currency: "USD",
  countryCode: "US",
  routeType: usRoute.routeType,
  shippingMode: usRoute.shippingMode,
  lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
  orderFingerprint: createOrderQuoteFingerprint({
    sourceOrderKey,
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
  }),
  now: new Date("2026-05-12T00:00:00.000Z"),
};

const regionalEasyshipPlan = buildRegionalEasyshipRatePlan(
  {
    routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP",
    regionalNode: "US_3PL",
    quoteRequest,
    destinationAddress: {
      country_alpha2: "US",
      line_1: "Synthetic destination",
      city: "Seattle",
      state: "WA",
      postal_code: "98101",
    },
    box: { length: 30, width: 20, height: 12, unit: "cm" },
    totalActualWeightKg: 1.2,
  },
  {
    EASYSHIP_MODE: "sandbox",
    EASYSHIP_API_TOKEN: "sandbox_synthetic_token",
    EASYSHIP_ENABLE_RATES: "true",
  },
);
assert.equal(regionalEasyshipPlan.externalActions, "none");
assert.equal(regionalEasyshipPlan.provider, "easyship");
assert.equal(regionalEasyshipPlan.purpose, "regional_last_mile");
assert.equal(regionalEasyshipPlan.request.url, "https://public-api-sandbox.easyship.com/2024-09/rates");
assert.equal(regionalEasyshipPlan.request.headers.authorization, "Bearer <configured>");
assert.equal(JSON.stringify(regionalEasyshipPlan).includes("sandbox_synthetic_token"), false);

assert.throws(
  () =>
    buildRegionalEasyshipRatePlan({
      routeFamily: "SFC_TO_EU_FREIGHT_EASYSHIP",
      regionalNode: "US_3PL",
      quoteRequest,
      destinationAddress: {
        country_alpha2: "DE",
        line_1: "Synthetic destination",
        city: "Berlin",
        postal_code: "10115",
      },
      box: { length: 30, width: 20, height: 12, unit: "cm" },
      totalActualWeightKg: 1.2,
    }),
  /must use EU_3PL/,
);

const sfcMock = createSfcReadiness({});
assert.equal(sfcMock.ok, true);
assert.equal(sfcMock.code, "sfc_mock_only");

const sfcReadOnly = createSfcReadiness({
  SFC_MODE: "read_only",
  SFC_CUSTOMER_ID: "synthetic-customer",
  SFC_APP_TOKEN: "synthetic-token",
  SFC_APP_KEY: "synthetic-key",
  SFC_ENABLE_READ_ONLY_API: "true",
  SFC_ENABLE_MUTATIONS: "false",
});
assert.equal(sfcReadOnly.ok, true);
assert.equal(sfcReadOnly.code, "sfc_read_only_ready");

const sfcSmokePlan = createSfcReadOnlySmokePlan(
  { warehouseId: 1, stockSku: "CLF-ODN-CORE", country: "HK", shippingMethodCode: "SFC-DDP-PREVIEW" },
  {
    SFC_MODE: "read_only",
    SFC_WSDL_URL: "https://example.test/sfc/wsdl",
    SFC_SERVICE_URL: "https://example.test/sfc/web-service",
    SFC_CUSTOMER_ID: "synthetic-customer",
    SFC_APP_TOKEN: "synthetic-token",
    SFC_APP_KEY: "synthetic-key",
    SFC_ENABLE_READ_ONLY_API: "true",
    SFC_ENABLE_MUTATIONS: "false",
  },
);
assert.equal(sfcSmokePlan.ok, true);
assert.equal(sfcSmokePlan.code, "sfc_read_only_plan_ready");
assert.deepEqual(
  sfcSmokePlan.requests.map((request) => request.action),
  ["getWarehouse", "getShippingMethod", "getStockBySKU", "getRateByMode"],
);
assert.equal(sfcSmokePlan.requests.every((request) => request.mutation === false), true);
assert.equal(sfcSmokePlan.externalActions, "none");
assert.equal(JSON.stringify(sfcSmokePlan).includes("synthetic-token"), false);
assert.equal(JSON.stringify(sfcSmokePlan).includes("synthetic-key"), false);

const sfcMutationBlocked = createSfcReadiness({
  SFC_MODE: "read_only",
  SFC_CUSTOMER_ID: "synthetic-customer",
  SFC_APP_TOKEN: "synthetic-token",
  SFC_APP_KEY: "synthetic-key",
  SFC_ENABLE_READ_ONLY_API: "true",
  SFC_ENABLE_MUTATIONS: "true",
});
assert.equal(sfcMutationBlocked.ok, false);
assert.equal(sfcMutationBlocked.code, "sfc_mutation_blocked");

const env = { SFC_WSDL_URL: "https://example.test/sfc/wsdl", SFC_SERVICE_URL: "https://example.test/sfc/web-service" };
const warehousePlan = buildSfcGetWarehousePlan(env);
const shippingMethodPlan = buildSfcGetShippingMethodPlan({ warehouseId: 1 }, env);
const ratePlan = buildSfcRatePlan(
  {
    country: "HK",
    weightKg: 1.2,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 12,
    warehouseId: 1,
    shippingMethodCode: "SFC-DDP-PREVIEW",
    priceType: "1",
  },
  env,
);
const rateEstimatePlan = buildSfcRatesEstimatePlan(
  {
    country: "HK",
    state: "HK",
    weightKg: 1.2,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 12,
    priceType: "1",
    divisionId: "1",
    zipCode: "000000",
  },
  env,
);
const stockPlan = buildSfcStockPlan({ sku: "CLF-ODN-CORE", warehouseId: 1 }, env);

for (const requestPlan of [warehousePlan, shippingMethodPlan, ratePlan, rateEstimatePlan, stockPlan]) {
  assert.equal(requestPlan.provider, "sendfromchina");
  assert.equal(requestPlan.method, "POST");
  assert.equal(requestPlan.url, env.SFC_SERVICE_URL);
  assert.equal(requestPlan.headers.SOAPAction, `http://www.chinafulfill.com/CffSvc/${requestPlan.action}`);
  assert.equal(requestPlan.mutation, false);
  assert.equal(requestPlan.externalActions, "none");
  assert.equal(requestPlan.body.includes("synthetic-token"), false);
  assert.equal(requestPlan.body.includes("synthetic-key"), false);
  assert.doesNotMatch(requestPlan.body, /<cff:\w+Request>/);
}

assert.equal(ratePlan.action, "getRateByMode");
assert.match(ratePlan.body, /<shippingmethod>SFC-DDP-PREVIEW<\/shippingmethod>/);
assert.equal(rateEstimatePlan.action, "getRates");
assert.match(rateEstimatePlan.body, /<divisionId>1<\/divisionId>/);
assert.match(rateEstimatePlan.body, /<zipCode>000000<\/zipCode>/);
assert.equal(stockPlan.action, "getStockBySKU");
assert.match(stockPlan.body, /<sku>CLF-ODN-CORE<\/sku>/);
assert.match(stockPlan.body, /<warehouseId>1<\/warehouseId>/);
assert.doesNotMatch(stockPlan.body, /<steps>/);

const sfcExecutionEnv = {
  SFC_CUSTOMER_ID: "synthetic-customer",
  SFC_APP_TOKEN: "synthetic-token",
  SFC_APP_KEY: "synthetic-key",
};
const executableWarehouseBody = hydrateSfcRequestBodyForExecution(warehousePlan, sfcExecutionEnv);
assert.equal(executableWarehouseBody.includes("&lt;configured&gt;"), false);
assert.equal(executableWarehouseBody.includes("synthetic-customer"), true);
assert.equal(executableWarehouseBody.includes("synthetic-token"), true);
assert.equal(executableWarehouseBody.includes("synthetic-key"), true);

const sfcExecutionSummary = summarizeSfcReadOnlyResponse(
  warehousePlan,
  {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/xml" }),
  },
  "<Envelope><Body><getWarehouseResponse><result>ok</result></getWarehouseResponse></Body></Envelope>",
  sfcExecutionEnv,
);
assert.equal(sfcExecutionSummary.ok, true);
assert.equal(sfcExecutionSummary.responseKind, "soap_response");
assert.equal(sfcExecutionSummary.hasWsdlDocument, false);
assert.equal(sfcExecutionSummary.responseBytes > 0, true);
assert.equal(JSON.stringify(sfcExecutionSummary).includes("synthetic-token"), false);

const sfcWsdlDocumentSummary = summarizeSfcReadOnlyResponse(
  warehousePlan,
  {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/xml" }),
  },
  "<wsdl:definitions><xsd:schema></xsd:schema></wsdl:definitions>",
  sfcExecutionEnv,
);
assert.equal(sfcWsdlDocumentSummary.ok, false);
assert.equal(sfcWsdlDocumentSummary.hasWsdlDocument, true);
assert.equal(sfcWsdlDocumentSummary.responseKind, "wsdl_document");

const sfcCredentialEchoSummary = summarizeSfcReadOnlyResponse(
  warehousePlan,
  {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/xml" }),
  },
  "<Envelope><Body>synthetic-token</Body></Envelope>",
  sfcExecutionEnv,
);
assert.equal(sfcCredentialEchoSummary.ok, false);
assert.equal(sfcCredentialEchoSummary.containsCredentialEcho, true);

const orderPreviewPlan = buildSfcCreateOrderPreviewPlan(
  {
    referenceNo: "pm-synthetic-ddp",
    warehouseId: 1,
    country: "HK",
    shippingMethodCode: "SFC-DDP-PREVIEW",
    postalCode: "98101",
    city: "Seattle",
    state: "WA",
    returnable: false,
    iossNo: "synthetic-ioss",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1, description: "ODUN core box", declaredValue: 199 }],
  },
  env,
);
assert.equal(orderPreviewPlan.action, "createOrder");
assert.equal(orderPreviewPlan.mutation, true);
assert.equal(orderPreviewPlan.externalActions, "none");
assert.equal(orderPreviewPlan.body.includes("98101"), false);
assert.equal(orderPreviewPlan.body.includes("Seattle"), false);
assert.equal(orderPreviewPlan.body.includes("synthetic-ioss"), false);
assert.match(orderPreviewPlan.body, /&lt;redacted/);

const asnPreviewPlan = buildSfcCreateAsnPreviewPlan(
  {
    referenceNo: "asn-synthetic",
    warehouseId: 1,
    trackingNumber: "1Z9999999999999999",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 10 }],
  },
  env,
);
assert.equal(asnPreviewPlan.action, "createASN");
assert.equal(asnPreviewPlan.mutation, true);
assert.equal(asnPreviewPlan.externalActions, "none");
assert.equal(asnPreviewPlan.body.includes("1Z9999999999999999"), false);
assert.match(asnPreviewPlan.body, /&lt;redacted&gt;/);

const sfcProductSyncPreview = createSfcProductSyncPreview(
  [
    {
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
      requiredQuantity: 1,
      stockOnHand: 48,
    },
    {
      sku: "CLF-ACC-STAND",
      title: "Display Stand",
      readinessStatus: "ready",
      requiredQuantity: 1,
      stockOnHand: 12,
    },
    {
      sku: "CLF-ACC-DDP",
      title: "DDP Test Add-on",
      readinessStatus: "ready",
      weightGrams: 200,
      lengthMm: 120,
      widthMm: 80,
      heightMm: 40,
      requiredQuantity: 1,
      stockOnHand: 0,
    },
  ],
  { routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP", warehouseId: 1 },
);
assert.equal(sfcProductSyncPreview.provider, "sendfromchina");
assert.deepEqual(sfcProductSyncPreview.summary, {
  ready: 1,
  needsReview: 1,
  blocked: 1,
  syncRequired: 3,
  externalActions: "none",
});
assert.equal(sfcProductSyncPreview.lines[0]?.payloadReady, true);
assert.equal(sfcProductSyncPreview.lines[0]?.payloadPreview?.weightKg, 1.2);
assert.equal(sfcProductSyncPreview.lines[1]?.issues.some((issue) => issue.code === "sfc_customs_review_required"), true);
assert.equal(sfcProductSyncPreview.lines[2]?.issues.some((issue) => issue.code === "sfc_stock_short"), true);
assert.equal(JSON.stringify(sfcProductSyncPreview).includes("sandbox_synthetic_token"), false);
assert.equal(sfcProductSyncPreview.externalActions, "none");

const builtinSyncLine = createSfcProductSyncLine(
  {
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    readinessStatus: "ready",
    isBuiltinMainBoxItem: true,
  },
  { routeFamily: "SFC_ASIA_DIRECT_DDP", warehouseId: 1 },
);
assert.equal(builtinSyncLine.syncRequired, false);
assert.equal(builtinSyncLine.payloadReady, false);
assert.equal(builtinSyncLine.externalActions, "none");

const asiaDdpCustomsBlocked = createSfcProductSyncLine(
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Add-on",
    readinessStatus: "ready",
    weightGrams: 200,
    lengthMm: 120,
    widthMm: 80,
    heightMm: 40,
    requiredQuantity: 1,
    stockOnHand: 10,
  },
  { routeFamily: "SFC_ASIA_DIRECT_DDP", warehouseId: 1 },
);
assert.equal(asiaDdpCustomsBlocked.status, "blocked");
assert.equal(asiaDdpCustomsBlocked.issues.some((issue) => issue.code === "missing_ddp_customs_field"), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "sfc-network",
      routeFamilies: [usRoute.routeFamily, euRoute.routeFamily, asiaRoute.routeFamily, manualRoute.routeFamily],
      externalActions: "none",
    },
    null,
    2,
  ),
);
