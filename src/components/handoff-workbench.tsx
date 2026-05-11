"use client";

import { Download, FileJson, LockKeyhole, PackageCheck, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";

type HandoffRow = {
  exportType: string;
  route: string;
  sourceOrderKey: string;
  status: string;
};

type HandoffWorkbenchProps = {
  rows: readonly HandoffRow[];
};

export function HandoffWorkbench({ rows }: HandoffWorkbenchProps) {
  const [format, setFormat] = useState("csv");
  const [partner, setPartner] = useState("Bölgesel depo");
  const [includeDdp, setIncludeDdp] = useState(true);
  const [includeRegional, setIncludeRegional] = useState(true);
  const [preview, setPreview] = useState("Henüz kargo dosyası önizlenmedi");

  const exportRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.status === "ready" &&
          ((includeDdp && row.route === "CHINA_HK_DIRECT_DDP") || (includeRegional && row.route === "REGIONAL_3PL")),
      ),
    [includeDdp, includeRegional, rows],
  );

  return (
    <section className="workbench-panel" data-testid="handoff-workbench">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Kargo teslimi</p>
          <h2>Dosya önizlemesi</h2>
        </div>
        <StatusBadge label={exportRows.length > 0 ? "ready" : "blocked"} />
      </div>

      <div className="field-grid two">
        <label>
          Kargo ekibi
          <select onChange={(event) => setPartner(event.target.value)} value={partner}>
            <option value="Bölgesel depo">Bölgesel depo</option>
            <option value="Manuel DDP masası">Manuel DDP masası</option>
            <option value="İlk fulfillment firması">İlk fulfillment firması</option>
          </select>
        </label>
        <label>
          Dosya formatı
          <select onChange={(event) => setFormat(event.target.value)} value={format}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>

      <div className="route-toggles" aria-label="Kargoya hazır rota filtreleri">
        <label className="checkbox-pill">
          <input checked={includeRegional} onChange={() => setIncludeRegional((current) => !current)} type="checkbox" />
          {formatOpsValue("route", "REGIONAL_3PL")}
        </label>
        <label className="checkbox-pill">
          <input checked={includeDdp} onChange={() => setIncludeDdp((current) => !current)} type="checkbox" />
          {formatOpsValue("route", "CHINA_HK_DIRECT_DDP")}
        </label>
      </div>

      <div className="decision-summary">
        <span>Önizleme</span>
        <strong>{exportRows.length} kilitli sipariş</strong>
        <small>{partner} / {format.toUpperCase()} / PM verisi değişmez.</small>
      </div>

      <div className="button-row">
        <button onClick={() => setPreview(`${exportRows.length} sipariş için ${format.toUpperCase()} önizlemesi hazırlandı`)} type="button">
          <Download aria-hidden="true" size={16} />
          Önizleme oluştur
        </button>
        <button className="button-secondary" onClick={() => setPreview(`${partner} dosya kontrolü geçti`)} type="button">
          <FileJson aria-hidden="true" size={16} />
          Dosyayı kontrol et
        </button>
        <button className="button-secondary" onClick={() => setPreview(`${exportRows.length} sipariş için paket listesi hazırlandı`)} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Paket listesi
        </button>
        <button className="button-danger" disabled type="button">
          <Send aria-hidden="true" size={16} />
          Partnere gönder
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Etiket oluştur
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {preview}
      </p>
    </section>
  );
}
