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
  const [routeByOrder, setRouteByOrder] = useState<Record<string, string>>({});
  const [holdReason, setHoldReason] = useState("Adres veya ürün kodu kontrolü");
  const [events, setEvents] = useState<string[]>(["Henüz canlı işlem yapılmadı"]);

  const selectedOrder = useMemo(
    () => rows.find((row) => row.sourceOrderKey === selectedOrderKey) ?? rows[0],
    [rows, selectedOrderKey],
  );
  const route = routeByOrder[selectedOrderKey] ?? selectedOrder?.route ?? routeOptions[0];

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
  const reviewCount = checks.filter((check) => check.status === "review").length;
  const readyForShipping = blockedCount === 0;

  if (!rows.length) {
    return (
      <section className="orders-console" data-testid="orders-workbench">
        <div className="empty-state">
          <p className="eyebrow">PM intake</p>
          <h2>Henüz aktarılmış sipariş yok</h2>
          <p>PM admininde manuel onay verilen backer Fulfillment intake&apos;e düştüğünde bu ekranda görünecek.</p>
        </div>
      </section>
    );
  }

  function addEvent(event: string) {
    const target = formatOpsValue("sourceOrderKey", selectedOrder?.sourceOrderKey ?? "selected order");
    setEvents((currentEvents) => [`${event}: ${target}`, ...currentEvents].slice(0, 5));
  }

  return (
    <section className="orders-console" data-testid="orders-workbench">
      <div className="orders-console-header">
        <div>
          <p className="eyebrow">Sipariş hazırlığı</p>
          <h2>{formatOpsValue("sourceOrderKey", selectedOrder?.sourceOrderKey ?? "Sipariş")}</h2>
        </div>
        <StatusBadge label={readyForShipping ? "ready" : "review"} />
      </div>

      <div className="orders-workspace">
        <div className="orders-primary">
          <div className="orders-next-step">
            <span>Sonraki adım</span>
            <strong>{readyForShipping ? "Kargo fiyatına geçebilir" : "Önce eksikleri kapat"}</strong>
            <small>{reviewCount > 0 ? `${reviewCount} kontrol noktası izleniyor` : "Adres, ürün ve rota tamam"}</small>
          </div>

          <div className="orders-field-row">
            <label>
              Sipariş
              <select aria-label="Kontrol siparişi" onChange={(event) => setSelectedOrderKey(event.target.value)} value={selectedOrderKey}>
                {rows.map((row) => (
                  <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                    {formatOpsValue("sourceOrderKey", row.sourceOrderKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kargo yolu
              <select
                aria-label="Kargo yolu"
                onChange={(event) =>
                  setRouteByOrder((currentRoutes) => ({
                    ...currentRoutes,
                    [selectedOrderKey]: event.target.value,
                  }))
                }
                value={route}
              >
                {routeOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatOpsValue("route", option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="orders-check-grid">
            {checks.map((check) => (
              <div className="orders-check" key={check.label}>
                <span>{check.label}</span>
                <StatusBadge label={check.status} />
              </div>
            ))}
          </div>

          <label className="orders-hold-reason">
            Bekletme sebebi
            <input onChange={(event) => setHoldReason(event.target.value)} value={holdReason} />
          </label>

          <div className="orders-actions">
            <button onClick={() => addEvent("Kargo yolu önizlendi")} type="button">
              <Route aria-hidden="true" size={16} />
              Kargo fiyatına geç
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
              Hazırlığı önizle
            </button>
            <button className="button-danger" disabled type="button">
              <LockKeyhole aria-hidden="true" size={16} />
              PM verisini değiştir
            </button>
          </div>

          <ol className="activity-feed" aria-live="polite">
            {events.map((event, index) => (
              <li key={`${event}:${index}`}>{event}</li>
            ))}
          </ol>
        </div>

        <aside className="orders-queue" aria-label="Sipariş kuyruğu">
          <div className="orders-queue-header">
            <p className="eyebrow">Kuyruk</p>
            <strong>{rows.length} sipariş</strong>
          </div>
          <div className="orders-queue-list">
            {rows.map((row) => {
              const isSelected = row.sourceOrderKey === selectedOrder?.sourceOrderKey;

              return (
                <button
                  aria-label={`${formatOpsValue("sourceOrderKey", row.sourceOrderKey)} siparişini seç`}
                  className="orders-queue-item"
                  data-selected={isSelected ? "true" : "false"}
                  key={row.sourceOrderKey}
                  onClick={() => setSelectedOrderKey(row.sourceOrderKey)}
                  type="button"
                >
                  <span>{formatOpsValue("sourceOrderKey", row.sourceOrderKey)}</span>
                  <small>{formatOpsValue("status", row.status)}</small>
                  <StatusBadge label={row.address === "complete" && row.products === "ready" ? "ready" : "review"} />
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
