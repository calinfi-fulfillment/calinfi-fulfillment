"use client";

import { Cable, KeyRound, LockKeyhole, RotateCw, ShieldCheck, Webhook } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import {
  buildEasyshipRatesRequestPlan,
  createEasyshipReadiness,
  createProviderHealthReport,
  easyshipProviderAdapter,
  mockFulfillmentProviderAdapter,
} from "@/lib/provider-adapter";

const readinessChecks = [
  { icon: KeyRound, label: "API anahtarı kasası", status: "not connected" },
  { icon: Cable, label: "Fiyat ve sipariş adresleri", status: "draft" },
  { icon: Webhook, label: "Takip webhook anlaşması", status: "draft" },
  { icon: ShieldCheck, label: "Tekrar gönderim koruması", status: "ready" },
] as const;

export function ProviderApiReadiness() {
  const [provider, setProvider] = useState("İlk fulfillment firması");
  const [environment, setEnvironment] = useState("mock");
  const [handshake, setHandshake] = useState("Henüz firma bağlantı testi çalışmadı");
  const [preview, setPreview] = useState("Henüz firma önizlemesi hazırlanmadı");
  const health = createProviderHealthReport({
    FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
    FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
  });
  const easyshipReadiness = createEasyshipReadiness({
    EASYSHIP_MODE: environment === "sandbox" ? "sandbox" : "mock",
    EASYSHIP_API_TOKEN: environment === "sandbox" ? "sandbox-token-present" : "",
    EASYSHIP_ENABLE_RATES: environment === "sandbox" ? "true" : "false",
    EASYSHIP_ENABLE_SHIPMENTS: "false",
    EASYSHIP_ENABLE_TRACKING: "false",
    FULFILLMENT_ENABLE_PROVIDER_API_QUOTES: "false",
    FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
  });
  const mockQuoteRequest = useMemo(
    () => ({
      orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      currency: "USD",
      countryCode: "US",
      routeType: "REGIONAL_3PL" as const,
      shippingMode: "3PL_INTERNAL_LABEL" as const,
      lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
      orderFingerprint: "mock-provider-preview",
      now: new Date("2026-05-11T00:00:00.000Z"),
    }),
    [],
  );

  function stageMockRates() {
    const rates = mockFulfillmentProviderAdapter.getRates!(mockQuoteRequest);
    const bestRate = rates[0]!;
    setPreview(`${bestRate.serviceLevel}: ${bestRate.currency} ${(bestRate.totalCents / 100).toFixed(2)} / ${bestRate.etaDaysMin}-${bestRate.etaDaysMax} gün`);
  }

  function stageMockHandoff() {
    const result = mockFulfillmentProviderAdapter.createHandoff!({
      orderId: mockQuoteRequest.orderId,
      sourceOrderKey: "pm:mock-provider-order",
      routeType: mockQuoteRequest.routeType,
      shippingMode: mockQuoteRequest.shippingMode,
      idempotencyKey: "mock-provider-order:handoff:v1",
    });

    setPreview(`${formatOpsValue("status", result.status)}: ${result.providerHandoffId}`);
  }

  function stageMockTracking() {
    const tracking = mockFulfillmentProviderAdapter.getTracking!({ providerHandoffId: "mock-handoff:mock-provider-order" });
    setPreview(`${formatOpsValue("status", tracking.status)}: ${tracking.trackingNumber}`);
  }

  function stageEasyshipRatesPlan() {
    const plan = buildEasyshipRatesRequestPlan(
      {
        quoteRequest: mockQuoteRequest,
        originAddress: {
          country_alpha2: "US",
          line_1: "Warehouse preview",
          city: "Los Angeles",
          state: "CA",
          postal_code: "90001",
        },
        destinationAddress: {
          country_alpha2: mockQuoteRequest.countryCode,
          line_1: "Synthetic destination",
          city: "Seattle",
          state: "WA",
          postal_code: "98101",
        },
        box: {
          length: 30,
          width: 20,
          height: 12,
          unit: "cm",
        },
        totalActualWeightKg: 1.2,
        incoterms: "DDU",
        calculateTaxAndDuties: false,
      },
      {
        EASYSHIP_MODE: "sandbox",
        EASYSHIP_API_TOKEN: "sandbox-token-present",
        EASYSHIP_ENABLE_RATES: "true",
      },
    );

    setPreview(`Easyship ${plan.method} ${plan.url.replace("https://public-api.easyship.com", "")} planlandı; token gizli`);
  }

  function stageEasyshipBlockedHandoff() {
    const result = easyshipProviderAdapter.createHandoff!({
      orderId: mockQuoteRequest.orderId,
      sourceOrderKey: "pm:mock-provider-order",
      routeType: mockQuoteRequest.routeType,
      shippingMode: mockQuoteRequest.shippingMode,
      idempotencyKey: "easyship-mock-provider-order:handoff:v1",
    });

    setPreview(`${formatOpsValue("status", result.status)}: ${result.reason}`);
  }

  return (
    <section className="workbench-panel" data-testid="provider-api-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Kargo firması bağlantısı</p>
          <h2>Bağlantı güvenli mi?</h2>
        </div>
        <StatusBadge label={health.ok && environment === "mock" ? "safe preview" : "review"} />
      </div>

      <div className="field-grid">
        <label>
          Firma
          <input onChange={(event) => setProvider(event.target.value)} value={provider} />
        </label>
        <label>
          Ortam
          <select onChange={(event) => setEnvironment(event.target.value)} value={environment}>
            <option value="mock">Sadece maket</option>
            <option value="sandbox">Sandbox planı</option>
            <option value="production">Canlı kapalı</option>
          </select>
        </label>
        <label>
          API anahtarı
          <input disabled placeholder="Daha sonra ortam sırrı ile bağlanacak" type="password" />
        </label>
      </div>

      <div className="checklist">
        {readinessChecks.map(({ icon: Icon, label, status }) => (
          <div className="check-row" key={label}>
            <span>
              <Icon aria-hidden="true" size={15} />
              {label}
            </span>
            <StatusBadge label={status} />
          </div>
        ))}
        {health.checks.map((check) => (
          <div className="check-row" key={check.name}>
            <span>
              <ShieldCheck aria-hidden="true" size={15} />
              {formatOpsValue("status", check.name)}
            </span>
            <StatusBadge label={check.ok ? "ready" : "blocked"} />
          </div>
        ))}
      </div>

      <div className="decision-summary">
        <span>Firma önizlemesi</span>
        <strong>{preview}</strong>
        <small>Bu panelden canlı API, etiket, dışa aktarım veya partner gönderimi yapılmaz.</small>
      </div>

      <div className="decision-summary">
        <span>Easyship durumu</span>
        <strong>{formatOpsValue("status", easyshipReadiness.code)}</strong>
        <small>Sandbox fiyat planı serbest; gönderi oluşturma, etiket, takip ve canlı mod kapalı kalır.</small>
      </div>

      <div className="button-row">
        <button onClick={() => setHandshake(`${provider} için ${environment} modunda maket bağlantı testi tamamlandı`)} type="button">
          <RotateCw aria-hidden="true" size={16} />
          Bağlantıyı dene
        </button>
        <button className="button-secondary" onClick={stageMockRates} type="button">
          Maket fiyat
        </button>
        <button className="button-secondary" onClick={stageMockHandoff} type="button">
          Maket teslim
        </button>
        <button className="button-secondary" onClick={stageMockTracking} type="button">
          Maket takip
        </button>
        <button className="button-secondary" onClick={stageEasyshipRatesPlan} type="button">
          Easyship fiyat planı
        </button>
        <button className="button-secondary" onClick={stageEasyshipBlockedHandoff} type="button">
          Easyship teslim kilidi
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Canlı API bağla
        </button>
      </div>
      <p className="local-state" aria-live="polite">
        {handshake}
      </p>
    </section>
  );
}
