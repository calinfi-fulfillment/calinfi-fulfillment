import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createHandoffPreview, exportHandoffRows, type ExportCandidateOrder } from "../src/lib/handoff";
import { processPaymentEvent, type PaymentEventPayload } from "../src/lib/payment-events";
import { buildPmIntakePlan } from "../src/lib/pm-intake/processor";
import type { PmIntakePayload } from "../src/lib/pm-intake/schema";
import { evaluateProductReadiness } from "../src/lib/product-readiness";
import {
  createManualDdpQuote,
  createOrderQuoteFingerprint,
  local3plFakeQuoteAdapter,
  resolveRoute,
  type QuoteRequestLine,
  type RouteRule,
} from "../src/lib/route-quote";

type FixtureOrder = {
  sourceOrderKey: string;
  countryCode: string;
  routeType: "REGIONAL_3PL" | "CHINA_HK_DIRECT_DDP";
  shippingMode: "3PL_INTERNAL_LABEL" | "DIRECT_DDP_PROVIDER";
  lines: Array<{
    sku: string;
    quantity: number;
    isBuiltinMainBoxItem?: boolean;
  }>;
};

const fixture = JSON.parse(readFileSync("fixtures/synthetic-pilot-orders.json", "utf8")) as {
  orders: FixtureOrder[];
};
const now = new Date("2026-05-11T00:00:00.000Z");
const seenEventKeys = new Set<string>();
const routeRules: RouteRule[] = [
  {
    ruleName: "synthetic-hk-ddp",
    countryCode: "HK",
    routeType: "CHINA_HK_DIRECT_DDP",
    shippingMode: "DIRECT_DDP_PROVIDER",
    priority: 1,
    enabled: true,
  },
  {
    ruleName: "synthetic-us-regional",
    countryCode: "US",
    routeType: "REGIONAL_3PL",
    shippingMode: "3PL_INTERNAL_LABEL",
    priority: 10,
    enabled: true,
  },
];
const products = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Core Box",
    readinessStatus: "ready" as const,
    weightGrams: 1200,
    lengthMm: 320,
    widthMm: 220,
    heightMm: 120,
    hsCode: "9503.00",
    countryOfOrigin: "CN",
    customsDescription: "Wood construction toy kit",
    declaredValueCents: 12000,
    declaredValueCurrency: "USD",
  },
  {
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    readinessStatus: "ready" as const,
    isBuiltinMainBoxItem: true,
  },
];
const productBySku = new Map(products.map((product) => [product.sku, product]));

const exportCandidates: ExportCandidateOrder[] = fixture.orders.map((order, index) => {
  const pledgeId = `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-1111-4111-8111-11111111111${index}`;
  const intakePayload: PmIntakePayload = {
    pledgeId,
    orderStatus: "selection_submitted",
    addressStatus: "complete",
    backer: {
      sourceBackerKey: `pm:synthetic-pilot-backer-${index + 1}`,
    },
    recipientSnapshot: { countryCode: order.countryCode },
    orderSnapshot: { sourceOrderKey: order.sourceOrderKey },
    lines: order.lines.map((line) => ({
      lineRole: line.isBuiltinMainBoxItem ? "builtin" : "reward",
      rewardCode: "ODUN_CORE",
      sku: line.sku,
      title: productBySku.get(line.sku)?.title ?? line.sku,
      quantity: line.quantity,
      isBuiltinMainBoxItem: line.isBuiltinMainBoxItem,
    })),
  };
  const intakePlan = buildPmIntakePlan(intakePayload, products);
  const route = resolveRoute({ countryCode: order.countryCode }, routeRules);
  const quoteLines: QuoteRequestLine[] = order.lines
    .filter((line) => !line.isBuiltinMainBoxItem)
    .map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      weightGrams: productBySku.get(line.sku)?.weightGrams,
    }));
  const fingerprint = createOrderQuoteFingerprint({
    sourceOrderKey: order.sourceOrderKey,
    countryCode: order.countryCode,
    lines: order.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
  });
  const readiness = quoteLines.map((line) =>
    evaluateProductReadiness(productBySku.get(line.sku)!, {
      routeType: route.routeType,
    }),
  );
  const quote =
    route.routeType === "CHINA_HK_DIRECT_DDP"
      ? createManualDdpQuote({
          orderId: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
          countryCode: order.countryCode,
          currency: "USD",
          lines: quoteLines,
          orderFingerprint: fingerprint,
          now,
          amountCents: 12345,
          providerQuoteId: `manual-ddp-${index + 1}`,
        })
      : local3plFakeQuoteAdapter.quote({
          orderId: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
          countryCode: order.countryCode,
          currency: "USD",
          routeType: route.routeType,
          shippingMode: route.shippingMode,
          lines: quoteLines,
          orderFingerprint: fingerprint,
          now,
        });
  const paymentPayload: PaymentEventPayload = {
    eventId: `evt_synthetic_pilot_${index + 1}`,
    eventType: route.routeType === "CHINA_HK_DIRECT_DDP" ? "owner.covered_payment.approved" : "stripe.checkout.session.completed",
    orderId: quote.orderId,
    quoteId: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${index}`,
    sourceOrderKey: order.sourceOrderKey,
    amountCents: quote.totalCents,
    currency: quote.currency,
    orderStatusBefore: "payment_pending",
    decisionStatusBefore: "payment_pending",
    quote: {
      ...quote,
      expiresAt: quote.expiresAt.toISOString(),
    },
    currentOrderFingerprint: fingerprint,
    ownerApproved: route.routeType === "CHINA_HK_DIRECT_DDP",
    now: now.toISOString(),
  };
  const payment = processPaymentEvent(paymentPayload, { seenEventKeys });

  assert.equal(intakePlan.blocked, false);
  assert.equal(route.routeType, order.routeType);
  assert.equal(route.shippingMode, order.shippingMode);
  assert.equal(readiness.every((result) => result.status === "ready"), true);
  assert.equal(payment.lockApplied, true);

  return {
    orderId: quote.orderId,
    sourceOrderKey: order.sourceOrderKey,
    orderStatus: payment.orderStatus,
    decisionStatus: payment.decisionStatus,
    paymentStatus: route.routeType === "CHINA_HK_DIRECT_DDP" ? "covered_approved" : "completed",
    routeType: route.routeType,
    shippingMode: route.shippingMode,
  };
});

const preview = createHandoffPreview(exportCandidates);
const exportedRows = exportHandoffRows(preview);

assert.equal(exportedRows.length, fixture.orders.length);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "synthetic-pilot-dry-run",
      orders: fixture.orders.length,
      exportedPreviewRows: exportedRows.length,
      mode: "synthetic-only",
    },
    null,
    2,
  ),
);
