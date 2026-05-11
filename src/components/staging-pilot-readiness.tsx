"use client";

import { ClipboardCheck, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { StagingPrepCheck, SyntheticPilotImportPlan } from "@/lib/staging-prep";

type StagingPilotReadinessProps = {
  checks: readonly StagingPrepCheck[];
  importPlan: SyntheticPilotImportPlan;
  mode: string;
  ok: boolean;
};

export function StagingPilotReadiness({ checks, importPlan, mode, ok }: StagingPilotReadinessProps) {
  const [event, setEvent] = useState("No Phase 13 action staged");
  const blockedChecks = checks.filter((check) => !check.ok && check.severity === "blocking");

  return (
    <section className="workbench-panel" data-testid="staging-pilot-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Phase 13</p>
          <h2>Staging Pilot Readiness</h2>
        </div>
        <StatusBadge label={ok ? mode : "blocked"} />
      </div>

      <div className="queue-grid compact">
        <article className="mini-metric">
          <span>Fixture</span>
          <strong>{importPlan.orders}</strong>
          <small>{importPlan.fixtureSafe ? "PII-safe synthetic orders" : "fixture review needed"}</small>
        </article>
        <article className="mini-metric">
          <span>Handoff preview</span>
          <strong>{importPlan.exportedPreviewRows}</strong>
          <small>in-memory export rows</small>
        </article>
        <article className="mini-metric">
          <span>Built-ins excluded</span>
          <strong>{importPlan.excludedBuiltinItems}</strong>
          <small>visible, not physical package lines</small>
        </article>
        <article className="mini-metric">
          <span>Blockers</span>
          <strong>{blockedChecks.length}</strong>
          <small>DB/API untouched</small>
        </article>
      </div>

      <div className="checklist">
        {checks.map((check) => (
          <div className="check-row" key={check.name}>
            <span>
              <ShieldCheck aria-hidden="true" size={15} />
              {check.name}
            </span>
            <StatusBadge label={check.ok ? "ready" : check.severity} />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button onClick={() => setEvent(`Mock pilot staged: ${importPlan.orders} orders / ${importPlan.exportedPreviewRows} export rows`)} type="button">
          <PlayCircle aria-hidden="true" size={16} />
          Run mock pilot
        </button>
        <button className="button-secondary" onClick={() => setEvent(`${blockedChecks.length} blockers ready for review`)} type="button">
          <ClipboardCheck aria-hidden="true" size={16} />
          Review blockers
        </button>
        <button className="button-secondary" onClick={() => setEvent("Owner approval package prepared locally")} type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Prepare owner approval
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Connect staging Supabase
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Stripe live
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Provider API push
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {event}
      </p>
    </section>
  );
}
