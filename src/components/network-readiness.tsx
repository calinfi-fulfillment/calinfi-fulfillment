"use client";

import { Boxes, FileText, LockKeyhole, PackageCheck, PlaneTakeoff, Route, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { buildRegionalEasyshipRatePlan } from "@/lib/easyship";
import { createFreightBatchPlan, createLandedCostPreview, resolveNetworkRoute, type NetworkRouteFamily } from "@/lib/network-plan";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import {
  buildSfcCreateAsnPreviewPlan,
  buildSfcCreateOrderPreviewPlan,
  buildSfcGetShippingMethodPlan,
  buildSfcGetWarehousePlan,
  buildSfcRatePlan,
  buildSfcStockPlan,
  createSfcProductSyncPreview,
  createSfcReadiness,
  createSfcReadOnlySmokePlan,
} from "@/lib/sfc";

const countries = [
  { code: "US", label: "Amerika" },
  { code: "DE", label: "Avrupa" },
  { code: "HK", label: "Asya DDP" },
] as const;

const sfcProductInputs = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Ana Kutu",
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
    title: "Stand",
    readinessStatus: "ready",
    requiredQuantity: 1,
    stockOnHand: 12,
  },
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Eklentisi",
    readinessStatus: "ready",
    weightGrams: 200,
    lengthMm: 120,
    widthMm: 80,
    heightMm: 40,
    requiredQuantity: 1,
    stockOnHand: 0,
  },
] as const;

const freightBatchInputs = [
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
] as const;

function cents(value: number, currency = "USD") {
  return `${currency} ${(value / 100).toFixed(2)}`;
}

function isRegionalRouteFamily(
  routeFamily: NetworkRouteFamily,
): routeFamily is Extract<NetworkRouteFamily, "SFC_TO_US_FREIGHT_EASYSHIP" | "SFC_TO_EU_FREIGHT_EASYSHIP"> {
  return routeFamily === "SFC_TO_US_FREIGHT_EASYSHIP" || routeFamily === "SFC_TO_EU_FREIGHT_EASYSHIP";
}

export function NetworkReadiness() {
  const [countryCode, setCountryCode] = useState<(typeof countries)[number]["code"]>("US");
  const [preview, setPreview] = useState("Henüz ağ planı hazırlanmadı");
  const routePlan = resolveNetworkRoute({ countryCode });
  const sfcReadiness = createSfcReadiness({
    SFC_MODE: "mock",
    SFC_ENABLE_READ_ONLY_API: "false",
    SFC_ENABLE_MUTATIONS: "false",
  });
  const quoteRequest = useMemo(
    () => ({
      orderId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      currency: "USD",
      countryCode,
      routeType: routePlan.routeType,
      shippingMode: routePlan.shippingMode,
      lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
      orderFingerprint: `network:${countryCode}`,
      now: new Date("2026-05-12T00:00:00.000Z"),
    }),
    [countryCode, routePlan.routeType, routePlan.shippingMode],
  );
  const sfcReadOnlyPlans = useMemo(
    () => [
      buildSfcGetWarehousePlan(),
      buildSfcGetShippingMethodPlan({ warehouseId: 1 }),
      buildSfcRatePlan({
        country: countryCode,
        weightKg: 1.2,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 12,
        warehouseId: 1,
        shippingMethodCode: routePlan.lastMileProvider === "sendfromchina" ? "SFC-DDP-PREVIEW" : undefined,
        priceType: "1",
      }),
      buildSfcStockPlan({ sku: "CLF-ODN-CORE", warehouseId: 1, page: 1, pageSize: 20 }),
    ],
    [countryCode, routePlan.lastMileProvider],
  );
  const sfcSmokePlan = useMemo(
    () =>
      createSfcReadOnlySmokePlan(
        {
          warehouseId: 1,
          stockSku: "CLF-ODN-CORE",
          country: countryCode,
          shippingMethodCode: routePlan.lastMileProvider === "sendfromchina" ? "SFC-DDP-PREVIEW" : undefined,
        },
        {
          SFC_MODE: "mock",
          SFC_ENABLE_READ_ONLY_API: "false",
          SFC_ENABLE_MUTATIONS: "false",
        },
      ),
    [countryCode, routePlan.lastMileProvider],
  );
  const sfcMutationPreviews = useMemo(
    () => [
      buildSfcCreateOrderPreviewPlan({
        referenceNo: "pm-synthetic-ddp",
        warehouseId: 1,
        country: countryCode,
        shippingMethodCode: "SFC-DDP-PREVIEW",
        postalCode: "000000",
        city: "Synthetic city",
        state: "Synthetic state",
        returnable: false,
        lines: [{ sku: "CLF-ODN-CORE", quantity: 1, description: "ODUN core box", declaredValue: 199 }],
      }),
      buildSfcCreateAsnPreviewPlan({
        referenceNo: "asn-synthetic",
        warehouseId: 1,
        trackingNumber: "redacted-preview",
        lines: [{ sku: "CLF-ODN-CORE", quantity: 24 }],
      }),
    ],
    [countryCode],
  );
  const sfcProductSync = useMemo(
    () => createSfcProductSyncPreview(sfcProductInputs, { routeFamily: routePlan.routeFamily, warehouseId: 1 }),
    [routePlan.routeFamily],
  );
  const sfcProductStatus = sfcProductSync.summary.blocked > 0 ? "blocking" : sfcProductSync.summary.needsReview > 0 ? "review" : "ready";
  const freightBatches = useMemo(() => createFreightBatchPlan(freightBatchInputs), []);
  const activeFreightBatch = useMemo(
    () => freightBatches.batches.find((batch) => batch.routeFamily === routePlan.routeFamily) ?? null,
    [freightBatches.batches, routePlan.routeFamily],
  );
  const regionalLandedCost = useMemo(() => {
    if (!isRegionalRouteFamily(routePlan.routeFamily)) return null;

    return createLandedCostPreview({
      routeFamily: routePlan.routeFamily,
      currency: "USD",
      orderChargeableWeightKg: 1.2,
      batchChargeableWeightKg: 120,
      bulkFreightCents: 42000,
      importDutyCents: 450,
      regionalReceivingCents: 275,
      regionalHandlingCents: 325,
      easyshipLastMileCents: 2480,
    });
  }, [routePlan.routeFamily]);
  const regionalEasyshipPlan = useMemo(() => {
    if (!isRegionalRouteFamily(routePlan.routeFamily)) return null;

    return buildRegionalEasyshipRatePlan(
      {
        routeFamily: routePlan.routeFamily,
        regionalNode: routePlan.regionalNode === "US_3PL" ? "US_3PL" : "EU_3PL",
        quoteRequest,
        destinationAddress: {
          country_alpha2: countryCode,
          line_1: "Synthetic destination",
          city: countryCode === "US" ? "Seattle" : "Berlin",
          state: countryCode === "US" ? "WA" : undefined,
          postal_code: countryCode === "US" ? "98101" : "10115",
        },
        box: { length: 30, width: 20, height: 12, unit: "cm" },
        totalActualWeightKg: 1.2,
      },
      { EASYSHIP_MODE: "sandbox", EASYSHIP_API_TOKEN: "sandbox-token-present", EASYSHIP_ENABLE_RATES: "true" },
    );
  }, [countryCode, quoteRequest, routePlan.regionalNode, routePlan.routeFamily]);

  function stageSfcReadOnlyPlan() {
    setPreview(`SFC read-only smoke: ${sfcSmokePlan.requests.map((request) => request.action).join(" + ")} hazır; owner credential bekliyor`);
  }

  function stageAsiaDdpPlan() {
    if (routePlan.routeFamily !== "SFC_ASIA_DIRECT_DDP") {
      setPreview("Bu seçim Asya DDP değil; US/EU için freight + Easyship kullanılır.");
      return;
    }

    const ratePlan = buildSfcRatePlan({
      country: countryCode,
      weightKg: 1.2,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 12,
      warehouseId: 1,
      priceType: "1",
    });
    const [orderPreview] = sfcMutationPreviews;

    setPreview(`SFC DDP: ${ratePlan.action} hazır; ${orderPreview.action} sadece redacted payload önizlemesi`);
  }

  function stageRegionalPlan() {
    if (routePlan.routeFamily === "SFC_ASIA_DIRECT_DDP" || routePlan.routeFamily === "MANUAL_SPECIAL") {
      setPreview("Bu seçim regional freight değil; Asya için SFC direct DDP kullanılır.");
      return;
    }

    if (!regionalLandedCost || !regionalEasyshipPlan) return;

    setPreview(
      `${formatOpsValue("status", routePlan.routeFamily)}: landed total ${cents(regionalLandedCost.totalCents)}; Easyship ${
        regionalEasyshipPlan.request.method
      } planlandı`,
    );
  }

  return (
    <section className="workbench-panel" data-testid="network-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">SFC + Easyship ağı</p>
          <h2>Hangi depo hangi işi yapıyor?</h2>
        </div>
        <StatusBadge label={sfcReadiness.code} />
      </div>

      <div className="network-safety-strip" role="status" aria-label="Ağ güvenlik durumu">
        <TriangleAlert aria-hidden="true" size={17} />
        <strong>Yerel/staging önizleme.</strong>
        <span>Canlı SFC, Easyship label, export, takip ve provider mutation kapalıdır.</span>
      </div>

      <div className="field-grid">
        <label>
          Pazar
          <select onChange={(event) => setCountryCode(event.target.value as (typeof countries)[number]["code"])} value={countryCode}>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
        <div className="decision-summary">
          <span>Ağ kararı</span>
          <strong>{formatOpsValue("status", routePlan.routeFamily)}</strong>
          <small>{routePlan.description}</small>
        </div>
      </div>

      <div className="network-grid">
        <article className="network-card" data-testid="sfc-hub-preview">
          <div>
            <span>
              <Boxes aria-hidden="true" size={15} />
              SFC China Hub
            </span>
            <StatusBadge label={sfcReadiness.code} />
          </div>
          <dl>
            <div>
              <dt>Origin</dt>
              <dd>{formatOpsValue("status", routePlan.originNode)}</dd>
            </div>
            <div>
              <dt>Read-only plan</dt>
              <dd>{sfcReadOnlyPlans.map((plan) => plan.action).join(" / ")}</dd>
            </div>
            <div>
              <dt>Mutation preview</dt>
              <dd>{sfcMutationPreviews.map((plan) => `${plan.action}: ${plan.mutation ? "locked" : "read"}`).join(" / ")}</dd>
            </div>
          </dl>
        </article>

        <article className="network-card" data-testid="sfc-read-only-smoke-plan">
          <div>
            <span>
              <ShieldCheck aria-hidden="true" size={15} />
              SFC read-only smoke
            </span>
            <StatusBadge label={sfcSmokePlan.code} />
          </div>
          <dl>
            <div>
              <dt>İstekler</dt>
              <dd>{sfcSmokePlan.requests.map((request) => request.action).join(" / ")}</dd>
            </div>
            <div>
              <dt>Credential</dt>
              <dd>Repo dışı .env.local / owner onayı gerekir</dd>
            </div>
            <div>
              <dt>External action</dt>
              <dd>{sfcSmokePlan.externalActions}</dd>
            </div>
          </dl>
        </article>

        <article className="network-card" data-testid="sfc-product-customs-preview">
          <div>
            <span>
              <FileText aria-hidden="true" size={15} />
              Product/customs
            </span>
            <StatusBadge label={sfcProductStatus} />
          </div>
          <dl>
            <div>
              <dt>Sync required</dt>
              <dd>{sfcProductSync.summary.syncRequired} SKU</dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>
                {sfcProductSync.summary.ready} hazır / {sfcProductSync.summary.needsReview} kontrol / {sfcProductSync.summary.blocked} blokaj
              </dd>
            </div>
            <div>
              <dt>External action</dt>
              <dd>{sfcProductSync.externalActions}</dd>
            </div>
          </dl>
          <div className="network-lines">
            {sfcProductSync.lines.map((line) => (
              <span key={line.sku}>
                {line.sku}
                <StatusBadge label={line.status} />
              </span>
            ))}
          </div>
        </article>

        <article className="network-card" data-testid="freight-batch-preview">
          <div>
            <span>
              <Truck aria-hidden="true" size={15} />
              Freight batch
            </span>
            <StatusBadge label={routePlan.requiresRegionalFreight ? "safe preview" : "not needed"} />
          </div>
          <dl>
            <div>
              <dt>Regional node</dt>
              <dd>{activeFreightBatch ? formatOpsValue("status", activeFreightBatch.regionalNode) : formatOpsValue("status", routePlan.regionalNode)}</dd>
            </div>
            <div>
              <dt>Batch manifest</dt>
              <dd>{activeFreightBatch ? `${activeFreightBatch.orderCount} order / ${activeFreightBatch.totalWeightKg} kg / ${activeFreightBatch.totalVolumeCbm} cbm` : "Yok"}</dd>
            </div>
            <div>
              <dt>Landed total</dt>
              <dd>{regionalLandedCost ? cents(regionalLandedCost.totalCents) : "SFC direct"}</dd>
            </div>
          </dl>
          {activeFreightBatch ? (
            <div className="network-lines">
              {activeFreightBatch.manifestLines.map((line) => (
                <span key={line.sku}>
                  {line.sku}
                  <small>
                    {line.quantity} adet / {line.totalWeightKg} kg
                  </small>
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="network-card" data-testid="easyship-last-mile-preview">
          <div>
            <span>
              <PlaneTakeoff aria-hidden="true" size={15} />
              Easyship last-mile
            </span>
            <StatusBadge label={regionalEasyshipPlan ? "rates_ready" : "not needed"} />
          </div>
          <dl>
            <div>
              <dt>Endpoint</dt>
              <dd>{regionalEasyshipPlan ? regionalEasyshipPlan.request.url.replace("https://public-api-sandbox.easyship.com", "sandbox") : "Yok"}</dd>
            </div>
            <div>
              <dt>Purpose</dt>
              <dd>{regionalEasyshipPlan ? "regional_last_mile" : routePlan.lastMileProvider}</dd>
            </div>
            <div>
              <dt>External action</dt>
              <dd>{regionalEasyshipPlan?.externalActions ?? "none"}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="network-flow" data-testid="network-flow-preview">
        <article>
          <FileText aria-hidden="true" size={16} />
          <span>SFC stock/customs payload PII ve secret içermez.</span>
        </article>
        <article>
          <PackageCheck aria-hidden="true" size={16} />
          <span>US/EU freight manifestinde final backer adresi yoktur.</span>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" size={16} />
          <span>Ödeme kilidi olmadan provider shipment/label kapalıdır.</span>
        </article>
      </div>

      <div className="checklist">
        <div className="check-row">
          <span>
            <Boxes aria-hidden="true" size={15} />
            SFC Çin ana hub
          </span>
          <StatusBadge label="ready" />
        </div>
        <div className="check-row">
          <span>
            <Truck aria-hidden="true" size={15} />
            US/EU bulk freight
          </span>
          <StatusBadge label={routePlan.requiresRegionalFreight ? "review" : "not needed"} />
        </div>
        <div className="check-row">
          <span>
            <PlaneTakeoff aria-hidden="true" size={15} />
            Easyship son teslimat
          </span>
          <StatusBadge label={routePlan.lastMileProvider === "easyship" ? "ready" : "not needed"} />
        </div>
        <div className="check-row">
          <span>
            <ShieldCheck aria-hidden="true" size={15} />
            SFC read-only smoke
          </span>
          <StatusBadge label={sfcSmokePlan.ok ? "ready" : "owner approval needed"} />
        </div>
        <div className="check-row">
          <span>
            <ShieldCheck aria-hidden="true" size={15} />
            SFC&apos;ye backer adresi
          </span>
          <StatusBadge label={routePlan.sendsBackerPiiToSfc ? "approval needed" : "blocked_non_critical"} />
        </div>
      </div>

      <div className="decision-summary">
        <span>Önizleme</span>
        <strong>{preview}</strong>
        <small>Bu panel canlı SFC, Easyship label veya provider mutation çalıştırmaz.</small>
      </div>

      <div className="button-row">
        <button onClick={stageSfcReadOnlyPlan} type="button">
          <Route aria-hidden="true" size={16} />
          SFC depo metodlarını planla
        </button>
        <button className="button-secondary" onClick={stageRegionalPlan} type="button">
          Freight + Easyship hesapla
        </button>
        <button className="button-secondary" onClick={stageAsiaDdpPlan} type="button">
          Asya DDP planla
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Canlı sağlayıcıya gönder
        </button>
      </div>
    </section>
  );
}
