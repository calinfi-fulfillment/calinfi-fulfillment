"use client";

import { ClipboardList, LockKeyhole, PackageCheck, PauseCircle, Route } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

type OrderRow = {
  address: string;
  products: string;
  route: string;
  sourceOrderKey: string;
  status: string;
};

type OrdersWorkbenchProps = {
  rows: readonly OrderRow[];
};

const routeOptions = ["REGIONAL_3PL", "CHINA_HK_DIRECT_DDP", "PARTNER_MANAGED", "MANUAL_SPECIAL"] as const;

export function OrdersWorkbench({ rows }: OrdersWorkbenchProps) {
  const [selectedOrderKey, setSelectedOrderKey] = useState(rows[0]?.sourceOrderKey ?? "");
  const [route, setRoute] = useState(rows[0]?.route ?? routeOptions[0]);
  const [holdReason, setHoldReason] = useState("Address or SKU review");
  const [events, setEvents] = useState<string[]>(["Order workbench ready in local preview"]);

  const selectedOrder = useMemo(
    () => rows.find((row) => row.sourceOrderKey === selectedOrderKey) ?? rows[0],
    [rows, selectedOrderKey],
  );
  const checks = useMemo(
    () => [
      { label: "Address complete", status: selectedOrder?.address === "complete" ? "ready" : "review" },
      { label: "Product Master ready", status: selectedOrder?.products === "ready" ? "ready" : "blocker" },
      { label: "Payment lock not required yet", status: selectedOrder?.status === "selection_submitted" ? "ready" : "review" },
      { label: "Route selected", status: route ? "ready" : "blocker" },
    ],
    [route, selectedOrder],
  );
  const blockedCount = checks.filter((check) => check.status === "blocker").length;

  function addEvent(event: string) {
    const target = selectedOrder?.sourceOrderKey ?? "selected order";
    setEvents((currentEvents) => [`${event}: ${target}`, ...currentEvents].slice(0, 5));
  }

  return (
    <section className="workbench-panel" data-testid="orders-workbench">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Order Control</p>
          <h2>Readiness workbench</h2>
        </div>
        <StatusBadge label={blockedCount > 0 ? "blocked" : "ready"} />
      </div>

      <div className="field-grid">
        <label>
          Order
          <select onChange={(event) => setSelectedOrderKey(event.target.value)} value={selectedOrderKey}>
            {rows.map((row) => (
              <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                {row.sourceOrderKey}
              </option>
            ))}
          </select>
        </label>
        <label>
          Route decision
          <select onChange={(event) => setRoute(event.target.value)} value={route}>
            {routeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hold reason
          <input onChange={(event) => setHoldReason(event.target.value)} value={holdReason} />
        </label>
      </div>

      <div className="checklist">
        {checks.map((check) => (
          <div className="check-row" key={check.label}>
            <span>{check.label}</span>
            <StatusBadge label={check.status} />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button onClick={() => addEvent("Route preview staged")} type="button">
          <Route aria-hidden="true" size={16} />
          Stage route
        </button>
        <button className="button-secondary" onClick={() => addEvent("Quote readiness checked")} type="button">
          <ClipboardList aria-hidden="true" size={16} />
          Check quote
        </button>
        <button className="button-secondary" onClick={() => addEvent(`Manual hold staged (${holdReason})`)} type="button">
          <PauseCircle aria-hidden="true" size={16} />
          Stage hold
        </button>
        <button className="button-secondary" onClick={() => addEvent("Fulfillment readiness preview")} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Preview lock
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Mutate PM
        </button>
      </div>

      <ol className="activity-feed" aria-live="polite">
        {events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ol>
    </section>
  );
}
