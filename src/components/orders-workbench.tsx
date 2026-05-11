"use client";

import { ClipboardList, LockKeyhole, PackageCheck, PauseCircle, Route } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";

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
  const [holdReason, setHoldReason] = useState("Adres veya ürün kodu kontrolü");
  const [events, setEvents] = useState<string[]>(["Sipariş kontrol ekranı güvenli önizleme modunda"]);

  const selectedOrder = useMemo(
    () => rows.find((row) => row.sourceOrderKey === selectedOrderKey) ?? rows[0],
    [rows, selectedOrderKey],
  );
  const checks = useMemo(
    () => [
      { label: "Adres tamam", status: selectedOrder?.address === "complete" ? "ready" : "review" },
      { label: "Ürün bilgisi hazır", status: selectedOrder?.products === "ready" ? "ready" : "blocker" },
      { label: "Ödeme kilidi henüz gerekmiyor", status: selectedOrder?.status === "selection_submitted" ? "ready" : "review" },
      { label: "Kargo yolu seçildi", status: route ? "ready" : "blocker" },
    ],
    [route, selectedOrder],
  );
  const blockedCount = checks.filter((check) => check.status === "blocker").length;

  function addEvent(event: string) {
    const target = formatOpsValue("sourceOrderKey", selectedOrder?.sourceOrderKey ?? "selected order");
    setEvents((currentEvents) => [`${event}: ${target}`, ...currentEvents].slice(0, 5));
  }

  return (
    <section className="workbench-panel" data-testid="orders-workbench">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Sipariş kontrolü</p>
          <h2>Hazır mı?</h2>
        </div>
        <StatusBadge label={blockedCount > 0 ? "blocked" : "ready"} />
      </div>

      <div className="field-grid">
        <label>
          Sipariş
          <select onChange={(event) => setSelectedOrderKey(event.target.value)} value={selectedOrderKey}>
            {rows.map((row) => (
              <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                {formatOpsValue("sourceOrderKey", row.sourceOrderKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kargo yolu
          <select onChange={(event) => setRoute(event.target.value)} value={route}>
            {routeOptions.map((option) => (
              <option key={option} value={option}>
                {formatOpsValue("route", option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bekletme sebebi
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
        <button onClick={() => addEvent("Kargo yolu önizlendi")} type="button">
          <Route aria-hidden="true" size={16} />
          Rotayı hazırla
        </button>
        <button className="button-secondary" onClick={() => addEvent("Kargo fiyatı kontrol edildi")} type="button">
          <ClipboardList aria-hidden="true" size={16} />
          Fiyatı kontrol et
        </button>
        <button className="button-secondary" onClick={() => addEvent(`Bekletme hazırlandı (${holdReason})`)} type="button">
          <PauseCircle aria-hidden="true" size={16} />
          Beklet
        </button>
        <button className="button-secondary" onClick={() => addEvent("Kargoya hazırlık önizlendi")} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Kilidi önizle
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          PM verisini değiştir
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
