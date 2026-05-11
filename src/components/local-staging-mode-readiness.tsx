import { Laptop, ShieldCheck, TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { VercelBypassReport } from "@/lib/vercel-bypass";

type LocalStagingModeReadinessProps = {
  report: VercelBypassReport;
};

function labelFor(status: VercelBypassReport["checks"][number]["status"]) {
  if (status === "ready") return "ready";
  if (status === "blocked_non_critical") return "not dev blocker";
  return "approval needed";
}

export function LocalStagingModeReadiness({ report }: LocalStagingModeReadinessProps) {
  return (
    <section className="workbench-panel" data-testid="vercel-bypass-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Vercel Bypass</p>
          <h2>Local-staging mode</h2>
        </div>
        <StatusBadge label={report.okForDevelopment ? "dev ready" : "blocked"} />
      </div>

      <div className="decision-summary">
        <span>Current mode</span>
        <strong>{report.mode}</strong>
        <small>Vercel Git integration is launch work, not a local/staging development blocker.</small>
      </div>

      <div className="checklist">
        {report.checks.map((check) => {
          const Icon = check.status === "ready" ? ShieldCheck : check.status === "blocked_non_critical" ? Laptop : TriangleAlert;

          return (
            <div className="check-row" key={check.name}>
              <span>
                <Icon aria-hidden="true" size={15} />
                {check.name}
              </span>
              <StatusBadge label={labelFor(check.status)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
