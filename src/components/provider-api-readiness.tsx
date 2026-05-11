"use client";

import { Cable, KeyRound, LockKeyhole, RotateCw, ShieldCheck, Webhook } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { createProviderHealthReport, mockFulfillmentProviderAdapter } from "@/lib/provider-adapter";

const readinessChecks = [
  { icon: KeyRound, label: "Credential vault", status: "not connected" },
  { icon: Cable, label: "Quote/order endpoint map", status: "draft" },
  { icon: Webhook, label: "Tracking webhook contract", status: "draft" },
  { icon: ShieldCheck, label: "Idempotency key strategy", status: "ready" },
] as const;

export function ProviderApiReadiness() {
  const [provider, setProvider] = useState("First fulfillment partner");
  const [environment, setEnvironment] = useState("mock");
  const [handshake, setHandshake] = useState("No provider handshake run");
  const [preview, setPreview] = useState("No mock provider preview staged");
  const health = createProviderHealthReport({
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
    setPreview(`${bestRate.serviceLevel}: ${bestRate.currency} ${(bestRate.totalCents / 100).toFixed(2)} / ETA ${bestRate.etaDaysMin}-${bestRate.etaDaysMax} days`);
  }

  function stageMockHandoff() {
    const result = mockFulfillmentProviderAdapter.createHandoff!({
      orderId: mockQuoteRequest.orderId,
      sourceOrderKey: "pm:mock-provider-order",
      routeType: mockQuoteRequest.routeType,
      shippingMode: mockQuoteRequest.shippingMode,
      idempotencyKey: "mock-provider-order:handoff:v1",
    });

    setPreview(`${result.status}: ${result.providerHandoffId}`);
  }

  function stageMockTracking() {
    const tracking = mockFulfillmentProviderAdapter.getTracking!({ providerHandoffId: "mock-handoff:mock-provider-order" });
    setPreview(`${tracking.status}: ${tracking.trackingNumber}`);
  }

  return (
    <section className="workbench-panel" data-testid="provider-api-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Provider API Prep</p>
          <h2>Connection readiness</h2>
        </div>
        <StatusBadge label={health.ok && environment === "mock" ? "safe preview" : "review"} />
      </div>

      <div className="field-grid">
        <label>
          Provider
          <input onChange={(event) => setProvider(event.target.value)} value={provider} />
        </label>
        <label>
          Environment
          <select onChange={(event) => setEnvironment(event.target.value)} value={environment}>
            <option value="mock">Mock only</option>
            <option value="sandbox">Sandbox planned</option>
            <option value="production">Production disabled</option>
          </select>
        </label>
        <label>
          API key
          <input disabled placeholder="Connect later via environment secret" type="password" />
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
              {check.name}
            </span>
            <StatusBadge label={check.ok ? "ready" : "blocked"} />
          </div>
        ))}
      </div>

      <div className="decision-summary">
        <span>Mock provider preview</span>
        <strong>{preview}</strong>
        <small>No provider API, label, export, or partner push is called from this panel.</small>
      </div>

      <div className="button-row">
        <button onClick={() => setHandshake(`${provider} mock handshake completed in ${environment} mode`)} type="button">
          <RotateCw aria-hidden="true" size={16} />
          Mock handshake
        </button>
        <button className="button-secondary" onClick={stageMockRates} type="button">
          Mock rates
        </button>
        <button className="button-secondary" onClick={stageMockHandoff} type="button">
          Mock handoff
        </button>
        <button className="button-secondary" onClick={stageMockTracking} type="button">
          Mock tracking
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Connect live API
        </button>
      </div>
      <p className="local-state" aria-live="polite">
        {handshake}
      </p>
    </section>
  );
}
