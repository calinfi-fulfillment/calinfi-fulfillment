"use client";

import { Boxes, ClipboardCheck, LockKeyhole, PackageCheck, RefreshCw, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { StatusBadge } from "@/components/status-badge";
import {
  buildFulfillmentStockFeed,
  buildInventoryAvailability,
  summarizeInventoryAvailability,
  type FulfillmentDemandInput,
  type InventorySupplyInput,
  type InventoryAvailabilityLine,
} from "@/lib/inventory";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import { buildSfcStockPlan } from "@/lib/sfc";

function quantity(value: number) {
  return value.toLocaleString("tr-TR");
}

function money(cents: number, currency = "USD") {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}${currency} ${Math.abs(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toTableRow(line: InventoryAvailabilityLine) {
  return {
    sku: line.sku,
    title: line.title,
    produced: String(line.producedQuantity),
    onHand: String(line.onHandQuantity),
    available: String(line.availableQuantity),
    demand: String(line.demandQuantity),
    shortage: String(line.shortageQuantity),
    originalAmount: money(line.originalAmountCents, line.currency).replace(/^\+/, ""),
    currentAmount: money(line.currentAmountCents, line.currency).replace(/^\+/, ""),
    amountDelta: money(line.amountDeltaCents, line.currency),
    status: line.status,
  };
}

type InventoryWorkbenchProps = {
  demandRows: readonly FulfillmentDemandInput[];
  supplyRows: readonly InventorySupplyInput[];
};

export function InventoryWorkbench({ demandRows, supplyRows }: InventoryWorkbenchProps) {
  const [activeSku, setActiveSku] = useState<string>(demandRows[0]?.sku ?? supplyRows[0]?.sku ?? "");
  const [event, setEvent] = useState("Stok feed henüz sadece yerel önizlemede");

  const availability = useMemo(() => buildInventoryAvailability(supplyRows, demandRows), [demandRows, supplyRows]);
  const summary = useMemo(() => summarizeInventoryAvailability(availability), [availability]);
  const feed = useMemo(() => buildFulfillmentStockFeed(availability), [availability]);
  const selectedLine = availability.find((line) => line.sku === activeSku) ?? availability[0];
  const selectedFeed = feed.find((line) => line.sku === selectedLine?.sku);
  const stockPlan = selectedLine ? buildSfcStockPlan({ sku: selectedLine.sku, warehouseId: 1 }) : null;
  const tableRows = availability.map(toTableRow);

  function stageFulfillmentFeed() {
    setEvent(`${feed.length} SKU için ayrılabilir stok güvenli önizleme olarak hazırlandı`);
  }

  function stageStockCheck() {
    if (!stockPlan || !selectedLine) return;
    setEvent(`${selectedLine.sku} için depo stok kontrolü planlandı; canlı stok yazımı yok`);
  }

  return (
    <section className="inventory-console" data-testid="inventory-workbench">
      <div className="inventory-safety-banner" role="status" aria-label="Stok güvenlik durumu">
        <TriangleAlert aria-hidden="true" size={18} />
        <strong>Canlı depo mutasyonu kapalı.</strong>
        <span>Staging stok feed</span>
        <span>PM verisi değişmez</span>
        <span>Depo kontrolü önizleme</span>
      </div>

      <div className="inventory-hero">
        <div>
          <p className="eyebrow">Üretim ve stok</p>
          <h2>Hangi SKU bugün ayrılabilir?</h2>
          <p>Üretilen, elde olan, rezerve edilen ve sipariş talebine ayrılabilecek adetleri aynı yerde kontrol et.</p>
        </div>
        <div className="button-row">
          <button onClick={stageFulfillmentFeed} type="button">
            <ClipboardCheck aria-hidden="true" size={16} />
            Ayrılabilir stok önizle
          </button>
          <button className="button-secondary" onClick={stageStockCheck} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Depo stok kontrolü
          </button>
          <button className="button-danger" disabled type="button">
            <LockKeyhole aria-hidden="true" size={16} />
            Canlı depo güncelle
          </button>
        </div>
      </div>

      <div className="inventory-metrics" aria-label="Stok özeti">
        <article className="inventory-metric">
          <span>Üretilen</span>
          <strong>{quantity(summary.totalProduced)}</strong>
          <small>Tüm batch toplamı</small>
        </article>
        <article className="inventory-metric">
          <span>Eldeki stok</span>
          <strong>{quantity(summary.totalOnHand)}</strong>
          <small>Depo + hub görünümü</small>
        </article>
        <article className="inventory-metric">
          <span>Ayrılabilir</span>
          <strong>{quantity(summary.totalAvailable)}</strong>
          <small>Rezerve ve güvenlik stok sonrası</small>
        </article>
        <article className="inventory-metric">
          <span>Fulfillment talebi</span>
          <strong>{quantity(summary.totalDemand)}</strong>
          <small>{quantity(summary.totalShortage)} adet açık</small>
        </article>
        <article className="inventory-metric">
          <span>Tutar değişimi</span>
          <strong>{money(summary.totalAmountDeltaCents, summary.currency)}</strong>
          <small>
            {money(summary.totalOriginalAmountCents, summary.currency).replace(/^\+/, "")}
            {" -> "}
            {money(summary.totalCurrentAmountCents, summary.currency).replace(/^\+/, "")}
          </small>
        </article>
      </div>

      <section className="workbench-panel">
          <div className="control-rail">
            <div>
              <p className="eyebrow">SKU stok durumu</p>
              <h2>Hangi ürün fulfillment için hazır?</h2>
            </div>
            <StatusBadge label={summary.totalShortage > 0 ? "review" : "feed_ready"} />
          </div>
          <div className="inventory-selector">
            <label>
              Stok SKU
              <select onChange={(input) => setActiveSku(input.target.value)} value={selectedLine?.sku ?? ""}>
                {availability.map((line) => (
                  <option key={line.sku} value={line.sku}>
                    {line.sku} / {line.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="decision-summary">
              <span>Ayrılabilir stok</span>
              <strong>
                {selectedFeed
                  ? `${quantity(selectedFeed.reservableQuantity)} / ${quantity(selectedFeed.demandQuantity)} ayrılabilir`
                  : "Talep yok"}
              </strong>
              <small>{selectedFeed ? `${quantity(selectedFeed.shortageQuantity)} açık` : "Built-in veya talep dışı SKU"}</small>
            </div>
          </div>
      </section>

      <div className="popup-row">
        <DetailPopup buttonLabel="Stok tablosunu aç" size="wide" title="SKU stok tablosu">
          <DataTable
            columns={["sku", "title", "produced", "onHand", "available", "demand", "shortage", "originalAmount", "currentAmount", "amountDelta", "status"]}
            rows={tableRows}
          />
        </DetailPopup>
        <DetailPopup buttonLabel="Seçili SKU detayı" size="wide" title={selectedLine?.sku ?? "SKU detayı"}>
          <aside className="inventory-side-panel">
          <article className="feed-card">
            <div>
              <PackageCheck aria-hidden="true" size={17} />
              <span>Ayrılabilir stok özeti</span>
              <StatusBadge label={selectedFeed?.status ?? "no_demand"} />
            </div>
            <dl>
              <div>
                <dt>SKU</dt>
                <dd>{selectedLine?.sku ?? "-"}</dd>
              </div>
              <div>
                <dt>Konum</dt>
                <dd>{selectedLine?.locations.map((location) => formatOpsValue("status", location)).join(" / ") ?? "-"}</dd>
              </div>
              <div>
                <dt>Batch</dt>
                <dd>{selectedLine?.batches.join(" / ") ?? "-"}</dd>
              </div>
              <div>
                <dt>Dış işlem</dt>
                <dd>{selectedFeed?.externalActions ?? "none"}</dd>
              </div>
              <div>
                <dt>Tutar değişimi</dt>
                <dd>{selectedFeed ? money(selectedFeed.amountDeltaCents, selectedFeed.currency) : "USD 0.00"}</dd>
              </div>
            </dl>
            <div className="inventory-bars" aria-label="Seçili SKU stok barı">
              <span
                style={{ width: `${Math.min(100, ((selectedLine?.availableQuantity ?? 0) / Math.max(1, selectedLine?.demandQuantity ?? 1)) * 100)}%` }}
              />
            </div>
          </article>

          <article className="feed-card">
            <div>
              <Boxes aria-hidden="true" size={17} />
              <span>Batch görünümü</span>
              <StatusBadge label="safe preview" />
            </div>
            <div className="inventory-batch-list">
              {supplyRows
                .filter((batch) => batch.sku === selectedLine?.sku)
                .map((batch) => (
                  <section key={batch.batchCode}>
                    <strong>{batch.batchCode}</strong>
                    <span>{batch.locationName}</span>
                    <small>
                      {quantity(batch.producedQuantity)} üretildi / {quantity(batch.onHandQuantity)} elde / {quantity(batch.inTransitQuantity ?? 0)} yolda
                    </small>
                  </section>
                ))}
            </div>
          </article>

          <article className="feed-card">
            <div>
              <ShieldCheck aria-hidden="true" size={17} />
              <span>Güvenli sınır</span>
              <StatusBadge label="live-actions" />
            </div>
            <ol>
              <li>Stok feed sadece Fulfillment staging şemasına aittir.</li>
              <li>Built-in kutu içeriği ayrı paket satırı olarak rezerve edilmez.</li>
              <li>Canlı SFC/Easyship/3PL güncellemesi owner onayı olmadan kapalıdır.</li>
            </ol>
          </article>
          </aside>
        </DetailPopup>
      </div>

      <div className="inventory-event-bar" aria-live="polite">
        <Truck aria-hidden="true" size={16} />
        {event}
      </div>
    </section>
  );
}
