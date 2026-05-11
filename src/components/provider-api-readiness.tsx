"use client";

import { Cable, KeyRound, LockKeyhole, RotateCw, ShieldCheck, Webhook } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";

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

  return (
    <section className="workbench-panel" data-testid="provider-api-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Provider API Prep</p>
          <h2>Connection readiness</h2>
        </div>
        <StatusBadge label={environment === "mock" ? "safe preview" : "review"} />
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
      </div>

      <div className="button-row">
        <button onClick={() => setHandshake(`${provider} mock handshake completed in ${environment} mode`)} type="button">
          <RotateCw aria-hidden="true" size={16} />
          Mock handshake
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
