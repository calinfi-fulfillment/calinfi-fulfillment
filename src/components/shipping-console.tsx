"use client";

import {
  CheckCircle2,
  Copy,
  LockKeyhole,
  PackageCheck,
  PlaneTakeoff,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import type { OpsGuardRow, OpsShipmentRow, OpsShippingOverviewRow, OpsShippingRateRow } from "@/lib/ops-ui/live-data";

const shipmentSteps = ["Sipariş", "Paket", "Fiyat", "Etiket"];

type ShippingConsoleProps = {
  guardRows: readonly OpsGuardRow[];
  overviewRows: readonly OpsShippingOverviewRow[];
  rateRows: readonly OpsShippingRateRow[];
  shipmentRows: readonly OpsShipmentRow[];
};

export function ShippingConsole({ guardRows, overviewRows, rateRows, shipmentRows }: ShippingConsoleProps) {
  const [activeOrder, setActiveOrder] = useState<string>(shipmentRows[0]?.sourceOrderKey ?? "");
  const [activeRate, setActiveRate] = useState<string>(rateRows[0]?.id ?? "");
  const [packageWeight, setPackageWeight] = useState("1.20");
  const [boxSize, setBoxSize] = useState("30 x 20 x 12 cm");
  const [event, setEvent] = useState("Kargo merkezi güvenli önizleme modunda");

  const selectedOrder = useMemo(
    () => shipmentRows.find((row) => row.sourceOrderKey === activeOrder) ?? shipmentRows[0],
    [activeOrder, shipmentRows],
  );
  const selectedRate = useMemo(() => rateRows.find((rate) => rate.id === activeRate) ?? rateRows[0], [activeRate, rateRows]);

  function stageRateCheck() {
    if (!selectedOrder || !selectedRate) {
      setEvent("Bu PM siparişi için henüz kargo fiyat kaydı yok; önce Fiyat ekranında hazırlık yap.");
      return;
    }

    setEvent(`${formatOpsValue("sourceOrderKey", activeOrder)} için ${selectedRate.carrier} kontrol edildi`);
  }

  function copySafeSummary() {
    if (!selectedOrder) {
      setEvent("PM intake'te gönderi hazırlanacak sipariş yok.");
      return;
    }

    setEvent(`${formatOpsValue("sourceOrderKey", activeOrder)} için güvenli kargo özeti hazırlandı; token ve PII yok`);
  }

  return (
    <section className="shipping-console" data-testid="shipping-console">
      <div className="ship-safety-banner" role="status" aria-label="Kargo güvenlik durumu">
        <TriangleAlert aria-hidden="true" size={18} />
        <strong>Canlı kargo aksiyonları kapalı.</strong>
        <span>Canlı etiket kapalı</span>
        <span>PM intake okunuyor</span>
        <span>Provider gönderimi kapalı</span>
      </div>

      <div className="shipping-hero">
        <div>
          <p className="eyebrow">Easyship tarzı kargo akışı</p>
          <h2>Kargo Merkezi</h2>
          <p>Siparişi seç, paket ölçüsünü kontrol et, fiyatı karşılaştır, canlı etiket basmadan güvenli önizleme yap.</p>
        </div>
        <div className="ship-hero-actions">
          <button onClick={stageRateCheck} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Fiyatı kontrol et
          </button>
          <button className="button-secondary" onClick={copySafeSummary} type="button">
            <Copy aria-hidden="true" size={16} />
            Güvenli özet hazırla
          </button>
          <button className="button-danger" disabled type="button">
            <LockKeyhole aria-hidden="true" size={16} />
            Canlı etiket bas
          </button>
        </div>
      </div>

      <div className="ship-overview">
        {overviewRows.map((row) => (
          <article className="ship-metric" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.detail}</small>
          </article>
        ))}
      </div>

      <div className="ship-workspace">
        <section className="ship-builder">
          <div className="ship-stepper" aria-label="Gönderi adımları">
            {shipmentSteps.map((step, index) => (
              <article key={step} data-active={index < 3 ? "true" : "false"}>
                <strong>{index + 1}</strong>
                <span>{step}</span>
              </article>
            ))}
          </div>

          <div className="ship-form-grid">
            <label>
              Sipariş
              <select aria-label="Gönderi siparişi" onChange={(event) => setActiveOrder(event.target.value)} value={activeOrder}>
                {shipmentRows.map((row) => (
                  <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                    {formatOpsValue("sourceOrderKey", row.sourceOrderKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Varış
              <input readOnly value={selectedOrder?.destination ?? ""} />
            </label>
            <label>
              Paket
              <input readOnly value={selectedOrder?.package ?? ""} />
            </label>
            <label>
              Ağırlık
              <input inputMode="decimal" onChange={(event) => setPackageWeight(event.target.value)} value={packageWeight} />
            </label>
            <label>
              Kutu ölçüsü
              <input onChange={(event) => setBoxSize(event.target.value)} value={boxSize} />
            </label>
            <label>
              Kargo yolu
              <input readOnly value={formatOpsValue("route", selectedOrder?.route ?? "")} />
            </label>
          </div>

          <div className="rate-board">
            {rateRows.map((rate) => (
              <button
                aria-pressed={activeRate === rate.id}
                className="rate-card"
                key={rate.id}
                onClick={() => setActiveRate(rate.id)}
                type="button"
              >
                <span>
                  <Truck aria-hidden="true" size={16} />
                  {rate.carrier}
                </span>
                <strong>{rate.price}</strong>
                <small>{rate.service} / {rate.eta}</small>
                <StatusBadge label={rate.status} />
                <em>{rate.score}</em>
              </button>
            ))}
            {rateRows.length === 0 ? (
              <div className="empty-state compact">
                <p className="eyebrow">Fiyat kaydı</p>
                <h2>Henüz fiyat yok</h2>
                <p>Provider ve canlı Easyship kapalı olduğu için bu panel sadece PM siparişini hazırlar.</p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="ship-side-panel">
          <div className="decision-summary">
            <span>Seçili kargo</span>
            <strong>{selectedRate?.carrier ?? "Fiyat yok"}</strong>
            <small>{selectedRate?.price ?? "-"} / {selectedRate?.eta ?? "-"}</small>
          </div>

          <div className="ship-guard-list">
            {guardRows.map((row) => (
              <article key={row.label}>
                <span>
                  <ShieldCheck aria-hidden="true" size={15} />
                  {row.label}
                </span>
                <StatusBadge label={row.status} />
                <small>{row.detail}</small>
              </article>
            ))}
          </div>

          <div className="ship-flow-card">
            <span>
              <PlaneTakeoff aria-hidden="true" size={16} />
              Güvenli akış
            </span>
            <ol>
              <li>Canlı PM verisine dokunma.</li>
              <li>Önce Fiyat ekranında güvenli fiyat kaydı hazırla.</li>
              <li>Ödeme kilidi olmadan etiket basma.</li>
              <li>Owner onayı olmadan partnere gönderme.</li>
            </ol>
          </div>
        </aside>
      </div>

      <div className="popup-row">
        <DetailPopup buttonLabel="Gönderi kuyruğunu aç" size="wide" title="Gönderi kuyruğu">
          <DataTable columns={["sourceOrderKey", "destination", "package", "route", "quote", "label"]} rows={shipmentRows} />
        </DetailPopup>
      </div>

      <div className="ship-event-bar" aria-live="polite">
        <CheckCircle2 aria-hidden="true" size={16} />
        {event}
      </div>

      <div className="ship-disabled-note">
        <PackageCheck aria-hidden="true" size={16} />
        Bu ekran Easyship benzeri operasyon düzenidir; Easyship marka arayüzünün birebir kopyası değildir. Canlı etiket, canlı gönderi ve canlı takip hâlâ kapalıdır.
      </div>
    </section>
  );
}
