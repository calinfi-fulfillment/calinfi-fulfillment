"use client";

import { Boxes, ClipboardList, LockKeyhole, PackageCheck, Ruler, Scale, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { PackagePlanResult, SfcFulfillmentVarianceReport, SfcPackingInstructionExport } from "@/lib/package-plan";

type PackagePlanPreviewProps = {
  plan: PackagePlanResult;
  quote: {
    currency: string;
    totalCents: number;
  };
  sfcExport: SfcPackingInstructionExport;
  sfcVarianceReport: SfcFulfillmentVarianceReport;
  sfcConfirmation: {
    preOrderCartonization: boolean;
    postUploadEstimate: boolean;
    finalMeasurement: boolean;
    trackingNumber: boolean;
  };
};

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);
}

function formatWeight(grams: number) {
  return `${(grams / 1000).toFixed(2)} kg`;
}

function formatDimensions(lengthMm: number, widthMm: number, heightMm: number) {
  return `${Math.round(lengthMm / 10)} x ${Math.round(widthMm / 10)} x ${Math.round(heightMm / 10)} cm`;
}

function formatSignedCents(cents: number | undefined, currency: string) {
  if (cents === undefined) return "-";
  if (cents === 0) return formatCents(0, currency);
  return `${cents > 0 ? "+" : "-"}${formatCents(Math.abs(cents), currency)}`;
}

function formatSignedWeight(grams: number | undefined) {
  if (grams === undefined) return "-";
  if (grams === 0) return "0.00 kg";
  return `${grams > 0 ? "+" : "-"}${formatWeight(Math.abs(grams))}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function PackagePlanPreview({ plan, quote, sfcExport, sfcVarianceReport, sfcConfirmation }: PackagePlanPreviewProps) {
  const [selectedPackageId, setSelectedPackageId] = useState(plan.packageUnits[0]?.packageId ?? "");
  const [event, setEvent] = useState("Package Plan local önizleme modunda");
  const selectedPackage = useMemo(
    () => plan.packageUnits.find((unit) => unit.packageId === selectedPackageId) ?? plan.packageUnits[0],
    [plan.packageUnits, selectedPackageId],
  );

  function stageInstruction() {
    setEvent(`${selectedPackage?.boxSku ?? "Paket"} için SFC packing instruction hazırlandı; canlı order oluşturulmadı`);
  }

  function stageSfcExport() {
    setEvent(`${sfcExport.referenceNo} için ${sfcExport.parcelCount} paketlik SFC export preview hazırlandı; dışa aktarım yapılmadı`);
  }

  function stageVarianceCheck() {
    setEvent(`${sfcVarianceReport.referenceNo} için SFC variance report ${statusLabel(sfcVarianceReport.status)} durumunda hazırlandı`);
  }

  return (
    <section className="package-plan-preview" data-testid="package-plan-preview">
      <div className="package-plan-header">
        <div>
          <p className="eyebrow">Package Plan Preview</p>
          <h2>Paketleme planı</h2>
          <p>
            PM Product Master snapshot&apos;ından kutu SKU&apos;ları, SFC packing instruction ve package-unit fiyat girdileri üretilir.
          </p>
        </div>
        <StatusBadge label={plan.status} />
      </div>

      <div className="package-confirmation" role="status" aria-label="SFC paketleme teyidi">
        <ShieldCheck aria-hidden="true" size={18} />
        <span>SFC pre-order cartonization yok</span>
        <span>{sfcConfirmation.postUploadEstimate ? "Order upload sonrası estimate var" : "Estimate belirsiz"}</span>
        <span>{sfcConfirmation.finalMeasurement ? "Final measurement var" : "Final ölçüm belirsiz"}</span>
        <span>{sfcConfirmation.trackingNumber ? "Tracking number var" : "Tracking belirsiz"}</span>
      </div>

      <div className="package-plan-metrics">
        <article>
          <span>Paket</span>
          <strong>{plan.summary.packageCount}</strong>
          <small>{plan.summary.itemQuantity} fiziksel item</small>
        </article>
        <article>
          <span>Toplam ağırlık</span>
          <strong>{formatWeight(plan.summary.totalWeightGrams)}</strong>
          <small>Box tare dahil</small>
        </article>
        <article>
          <span>Kutu maliyeti</span>
          <strong>{formatCents(plan.summary.packagingCostCents, plan.summary.currency)}</strong>
          <small>Quote component</small>
        </article>
        <article>
          <span>Package quote</span>
          <strong>{formatCents(quote.totalCents, quote.currency)}</strong>
          <small>Local synthetic adapter</small>
        </article>
      </div>

      <div className="package-plan-grid">
        <div className="package-unit-list" aria-label="Paket birimleri">
          {plan.packageUnits.map((unit) => (
            <button
              aria-pressed={unit.packageId === selectedPackage?.packageId}
              className="package-unit-card"
              key={unit.packageId}
              onClick={() => setSelectedPackageId(unit.packageId)}
              type="button"
            >
              <span>
                <Boxes aria-hidden="true" size={16} />
                {unit.boxSku}
              </span>
              <strong>{unit.sfcBoxSku ?? unit.boxSku}</strong>
              <small>{formatWeight(unit.totalWeightGrams)} / {formatDimensions(unit.outerLengthMm, unit.outerWidthMm, unit.outerHeightMm)}</small>
              <em>{unit.items.map((item) => `${item.sku} x${item.quantity}`).join(", ")}</em>
            </button>
          ))}
        </div>

        <aside className="package-detail-panel">
          <div className="decision-summary">
            <span>Seçili paket</span>
            <strong>{selectedPackage?.boxSku ?? "Paket yok"}</strong>
            <small>{selectedPackage?.packingInstruction ?? "Instruction yok"}</small>
          </div>

          <div className="package-detail-grid">
            <article>
              <Scale aria-hidden="true" size={15} />
              <span>{formatWeight(selectedPackage?.totalWeightGrams ?? 0)}</span>
            </article>
            <article>
              <Ruler aria-hidden="true" size={15} />
              <span>
                {selectedPackage
                  ? formatDimensions(selectedPackage.outerLengthMm, selectedPackage.outerWidthMm, selectedPackage.outerHeightMm)
                  : "-"}
              </span>
            </article>
            <article>
              <PackageCheck aria-hidden="true" size={15} />
              <span>{formatCents(selectedPackage?.declaredValueCents ?? 0, plan.summary.currency)}</span>
            </article>
          </div>

          <div className="package-customs-list">
            {selectedPackage?.customsLines.map((line) => (
              <article key={line.sku}>
                <span>{line.sku} x{line.quantity}</span>
                <small>{line.hsCode ?? "HS eksik"} / {line.countryOfOrigin ?? "origin eksik"}</small>
                <strong>{formatCents(line.declaredValueCents, line.currency)}</strong>
              </article>
            ))}
          </div>

          <div className="button-row">
            <button onClick={stageInstruction} type="button">
              <ClipboardList aria-hidden="true" size={16} />
              Instruction hazırla
            </button>
            <button className="button-secondary" onClick={stageSfcExport} type="button">
              <Boxes aria-hidden="true" size={16} />
              SFC export hazırla
            </button>
            <button className="button-secondary" onClick={stageVarianceCheck} type="button">
              <ShieldCheck aria-hidden="true" size={16} />
              Variance planla
            </button>
            <button className="button-danger" disabled type="button">
              <LockKeyhole aria-hidden="true" size={16} />
              SFC order oluştur
            </button>
          </div>
        </aside>
      </div>

      <section className="sfc-export-preview" data-testid="sfc-packing-export-preview">
        <div className="control-rail">
          <div>
            <p className="eyebrow">SFC export preview</p>
            <h2>SFC&apos;ye gidecek packing instruction</h2>
          </div>
          <StatusBadge label={sfcExport.externalActions} />
        </div>

        <div className="sfc-export-note">
          <span>Reference</span>
          <strong>{sfcExport.referenceNo}</strong>
          <small>{sfcExport.orderNote}</small>
        </div>

        <div className="sfc-export-grid">
          {sfcExport.rows.map((row) => (
            <article key={row.packageId}>
              <span>{row.packageId} / {row.sfcBoxSku}</span>
              <strong>{row.totalWeightKg} kg · {row.dimensionsCm} cm</strong>
              <small>{row.itemSummary}</small>
              <em>{row.packingInstruction}</em>
            </article>
          ))}
        </div>

        <div className="sfc-export-safety">
          <span>{sfcExport.containsBackerPii ? "PII kontrol edilmeli" : "Backer PII yok"}</span>
          <span>{sfcExport.mutation ? "Mutation riski" : "Canlı SFC mutation yok"}</span>
          <span>CSV preview {sfcExport.csv.split("\n").length - 1} satır</span>
        </div>
      </section>

      <section className="sfc-variance-report" data-testid="sfc-variance-report">
        <div className="control-rail">
          <div>
            <p className="eyebrow">SFC variance report</p>
            <h2>Estimate, final ölçüm ve tracking farkı</h2>
          </div>
          <StatusBadge label={statusLabel(sfcVarianceReport.status)} />
        </div>

        <div className="sfc-variance-metrics">
          <article>
            <span>Pre-payment quote</span>
            <strong>{formatCents(sfcVarianceReport.quote.prePaymentTotalCents, sfcVarianceReport.quote.currency)}</strong>
            <small>Backer&apos;dan tahsil edilecek kilitli tutar</small>
          </article>
          <article>
            <span>SFC estimate</span>
            <strong>
              {sfcVarianceReport.estimate
                ? formatCents(sfcVarianceReport.estimate.estimatedShippingFeeCents, sfcVarianceReport.estimate.currency)
                : "-"}
            </strong>
            <small>{sfcVarianceReport.estimate?.channelName ?? "Order upload sonrası beklenir"}</small>
          </article>
          <article>
            <span>Final actual</span>
            <strong>
              {sfcVarianceReport.actual
                ? formatCents(sfcVarianceReport.actual.finalShippingFeeCents, sfcVarianceReport.actual.currency)
                : "-"}
            </strong>
            <small>SFC final measurement sonrası</small>
          </article>
          <article>
            <span>Tracking</span>
            <strong>
              {sfcVarianceReport.summary.trackingCount}/{sfcVarianceReport.summary.finalPackageCount ?? plan.summary.packageCount}
            </strong>
            <small>{sfcVarianceReport.summary.missingTrackingCount === 0 ? "Tracking tamam" : "Tracking bekleniyor"}</small>
          </article>
        </div>

        <div className="sfc-variance-deltas">
          <article>
            <span>Quote → estimate</span>
            <strong>{formatSignedCents(sfcVarianceReport.summary.quoteToEstimateDeltaCents, sfcVarianceReport.quote.currency)}</strong>
          </article>
          <article>
            <span>Estimate → final</span>
            <strong>{formatSignedCents(sfcVarianceReport.summary.estimateToFinalDeltaCents, sfcVarianceReport.quote.currency)}</strong>
          </article>
          <article>
            <span>Quote → final</span>
            <strong>{formatSignedCents(sfcVarianceReport.summary.quoteToFinalDeltaCents, sfcVarianceReport.quote.currency)}</strong>
          </article>
          <article>
            <span>Ağırlık farkı</span>
            <strong>{formatSignedWeight(sfcVarianceReport.summary.weightDeltaGrams)}</strong>
          </article>
        </div>

        <div className="sfc-parcel-variance-grid">
          {sfcVarianceReport.packageRows.map((row) => (
            <article key={`${row.packageId}-${row.parcelNo ?? "pending"}`}>
              <span>{row.packageId} / {row.plannedBoxSku ?? "SFC extra parcel"}</span>
              <strong>
                {formatWeight(row.plannedWeightGrams)}
                {row.actualWeightGrams ? ` → ${formatWeight(row.actualWeightGrams)}` : ""}
              </strong>
              <small>
                {row.plannedDimensionsMm}
                {row.actualDimensionsMm ? ` → ${row.actualDimensionsMm}` : ""}
              </small>
              <em>{row.trackingNumber ?? "Tracking bekleniyor"}</em>
            </article>
          ))}
        </div>

        <div className="sfc-variance-safety">
          <span>{sfcVarianceReport.containsBackerPii ? "PII kontrol edilmeli" : "Backer PII yok"}</span>
          <span>{sfcVarianceReport.mutation ? "Mutation riski" : "Canlı SFC mutation yok"}</span>
          <span>{sfcVarianceReport.externalActions}</span>
          <span>{sfcVarianceReport.issues.length} review issue</span>
        </div>
      </section>

      <div className="package-event-bar" aria-live="polite">
        <PackageCheck aria-hidden="true" size={16} />
        {event}
      </div>
    </section>
  );
}
