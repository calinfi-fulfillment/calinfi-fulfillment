"use client";

import { BarChart3, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table";

type ReportRow = {
  metric: string;
  value: string;
};

type ReportsDashboardProps = {
  rows: readonly ReportRow[];
};

const routeOptions = ["REGIONAL_3PL", "CHINA_HK_DIRECT_DDP", "PARTNER_MANAGED"] as const;

export function ReportsDashboard({ rows }: ReportsDashboardProps) {
  const [range, setRange] = useState("30d");
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(["REGIONAL_3PL", "CHINA_HK_DIRECT_DDP"]);
  const [previewState, setPreviewState] = useState("No aggregate preview generated");

  const maxValue = useMemo(() => Math.max(...rows.map((row) => Number.parseInt(row.value, 10) || 0), 1), [rows]);

  function toggleRoute(route: string) {
    setSelectedRoutes((currentRoutes) =>
      currentRoutes.includes(route) ? currentRoutes.filter((currentRoute) => currentRoute !== route) : [...currentRoutes, route],
    );
  }

  return (
    <div className="reports-workspace" data-testid="reports-dashboard">
      <section className="report-controls">
        <div className="segmented-control" aria-label="Report range">
          {["7d", "30d", "all"].map((option) => (
            <button aria-pressed={range === option} key={option} onClick={() => setRange(option)} type="button">
              {option}
            </button>
          ))}
        </div>
        <div className="route-toggles" aria-label="Route filter">
          {routeOptions.map((route) => (
            <label className="checkbox-pill" key={route}>
              <input checked={selectedRoutes.includes(route)} onChange={() => toggleRoute(route)} type="checkbox" />
              {route}
            </label>
          ))}
        </div>
        <div className="button-row">
          <button onClick={() => setPreviewState(`${range} aggregate preview for ${selectedRoutes.length} routes`)} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Generate
          </button>
          <button className="button-secondary" onClick={() => setPreviewState(`PII-safe export preview staged for ${range}`)} type="button">
            <Download aria-hidden="true" size={16} />
            Export preview
          </button>
        </div>
      </section>

      <section className="metric-board">
        {rows.map((row) => {
          const value = Number.parseInt(row.value, 10) || 0;
          const width = `${Math.max((value / maxValue) * 100, 4)}%`;

          return (
            <article className="metric-card" key={row.metric}>
              <span>
                <BarChart3 aria-hidden="true" size={16} />
                {row.metric}
              </span>
              <strong>{row.value}</strong>
              <div className="bar-track">
                <i style={{ width }} />
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="control-rail">
          <div>
            <p className="eyebrow">Aggregate Output</p>
            <h2>Summary table</h2>
          </div>
          <span>
            <ShieldCheck aria-hidden="true" size={16} />
            {previewState}
          </span>
        </div>
        <DataTable columns={["metric", "value"]} rows={rows} />
      </section>
    </div>
  );
}
