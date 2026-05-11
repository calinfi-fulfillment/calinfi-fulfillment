"use client";

import {
  CheckCircle2,
  Copy,
  LockKeyhole,
  PackageCheck,
  PlaneTakeoff,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import { shipmentConsoleRows, shippingGuardRows, shippingOverviewRows, shippingRateRows } from "@/lib/ops-ui/fixtures";

const shipmentSteps = ["Sipariş", "Paket", "Fiyat", "Etiket"];

export function ShippingConsole() {
  const [activeOrder, setActiveOrder] = useState<string>(shipmentConsoleRows[0]?.sourceOrderKey ?? "");
  const [activeRate, setActiveRate] = useState<string>(shippingRateRows[0]?.id ?? "");
  const [packageWeight, setPackageWeight] = useState("1.20");
  const [boxSize, setBoxSize] = useState("30 x 20 x 12 cm");
  const [event, setEvent] = useState("Kargo merkezi güvenli önizleme modunda");

  const selectedOrder = useMemo(
    () => shipmentConsoleRows.find((row) => row.sourceOrderKey === activeOrder) ?? shipmentConsoleRows[0],
    [activeOrder],
  );
  const selectedRate = useMemo(() => shippingRateRows.find((rate) => rate.id === activeRate) ?? shippingRateRows[0], [activeRate]);

  function stageRateCheck() {
    setEvent(`${formatOpsValue("sourceOrderKey", activeOrder)} için ${selectedRate?.carrier ?? "seçili fiyat"} önizlendi`);
  }

  function copySafeSummary() {
    setEvent(`${formatOpsValue("sourceOrderKey", activeOrder)} için güvenli kargo özeti hazırlandı; token ve PII yok`);
  }

  return (
    <section className="shipping-console" data-testid="shipping-console">
      <div className="shipping-hero">
        <div>
          <p className="eyebrow">Easyship tarzı kargo akışı</p>
          <h2>Kargo Merkezi</h2>
          <p>Siparişi seç, paket ölçüsünü kontrol et, fiyatı karşılaştır, canlı etiket basmadan güvenli önizleme yap.</p>
          <div className="ship-safety-pills" aria-label="Kargo güvenlik durumu">
            <span>Canlı etiket kapalı</span>
            <span>PM verisi korunuyor</span>
            <span>Sandbox fiyat denemesi</span>
          </div>
        </div>
        <div className="ship-hero-actions">
          <button onClick={stageRateCheck} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Sandbox fiyatı dene
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
        {shippingOverviewRows.map((row) => (
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
              <select onChange={(event) => setActiveOrder(event.target.value)} value={activeOrder}>
                {shipmentConsoleRows.map((row) => (
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
            {shippingRateRows.map((rate) => (
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
          </div>
        </section>

        <aside className="ship-side-panel">
          <div className="decision-summary">
            <span>Seçili kargo</span>
            <strong>{selectedRate?.carrier ?? "Fiyat yok"}</strong>
            <small>{selectedRate?.price ?? "-"} / {selectedRate?.eta ?? "-"}</small>
          </div>

          <div className="ship-guard-list">
            {shippingGuardRows.map((row) => (
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
              <li>Önce sandbox fiyatı dene.</li>
              <li>Ödeme kilidi olmadan etiket basma.</li>
              <li>Owner onayı olmadan partnere gönderme.</li>
            </ol>
          </div>
        </aside>
      </div>

      <section className="ship-table-panel">
        <div className="control-rail">
          <div>
            <p className="eyebrow">Gönderi kuyruğu</p>
            <h2>Hangi sipariş hangi aşamada?</h2>
          </div>
          <span>
            <Search aria-hidden="true" size={16} />
            Filtrele, seç, önizle
          </span>
        </div>
        <DataTable columns={["sourceOrderKey", "destination", "package", "route", "quote", "label"]} rows={shipmentConsoleRows} />
      </section>

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
