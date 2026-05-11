"use client";

import { Download, FileJson, LockKeyhole, PackageCheck, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

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
  const [partner, setPartner] = useState("Regional 3PL");
  const [includeDdp, setIncludeDdp] = useState(true);
  const [includeRegional, setIncludeRegional] = useState(true);
  const [preview, setPreview] = useState("No handoff preview staged");

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
          <p className="eyebrow">Handoff Control</p>
          <h2>Export builder</h2>
        </div>
        <StatusBadge label={exportRows.length > 0 ? "ready" : "blocked"} />
      </div>

      <div className="field-grid two">
        <label>
          Partner
          <select onChange={(event) => setPartner(event.target.value)} value={partner}>
            <option value="Regional 3PL">Regional 3PL</option>
            <option value="Manual DDP Desk">Manual DDP Desk</option>
            <option value="First fulfillment partner">First fulfillment partner</option>
          </select>
        </label>
        <label>
          Format
          <select onChange={(event) => setFormat(event.target.value)} value={format}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>

      <div className="route-toggles" aria-label="Handoff route filters">
        <label className="checkbox-pill">
          <input checked={includeRegional} onChange={() => setIncludeRegional((current) => !current)} type="checkbox" />
          REGIONAL_3PL
        </label>
        <label className="checkbox-pill">
          <input checked={includeDdp} onChange={() => setIncludeDdp((current) => !current)} type="checkbox" />
          CHINA_HK_DIRECT_DDP
        </label>
      </div>

      <div className="decision-summary">
        <span>Preview</span>
        <strong>{exportRows.length} locked orders</strong>
        <small>{partner} / {format.toUpperCase()} / PM data remains unchanged.</small>
      </div>

      <div className="button-row">
        <button onClick={() => setPreview(`${format.toUpperCase()} preview staged for ${exportRows.length} orders`)} type="button">
          <Download aria-hidden="true" size={16} />
          Build preview
        </button>
        <button className="button-secondary" onClick={() => setPreview(`Schema validation passed for ${partner}`)} type="button">
          <FileJson aria-hidden="true" size={16} />
          Validate schema
        </button>
        <button className="button-secondary" onClick={() => setPreview(`Pack list preview staged for ${exportRows.length} orders`)} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Pack list
        </button>
        <button className="button-danger" disabled type="button">
          <Send aria-hidden="true" size={16} />
          Push partner API
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Create labels
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {preview}
      </p>
    </section>
  );
}
