import { Laptop, ShieldCheck, TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";
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
          <p className="eyebrow">Güvenli çalışma</p>
          <h2>Yerel test modu</h2>
        </div>
        <StatusBadge label={report.okForDevelopment ? "dev ready" : "blocked"} />
      </div>

      <div className="decision-summary">
        <span>Mevcut mod</span>
        <strong>Yerel + staging geliştirme</strong>
        <small>Vercel bağlantısı canlı yayına yaklaşırken çözülecek; bugün geliştirmeyi durdurmaz.</small>
      </div>

      <div className="checklist">
        {report.checks.map((check) => {
          const Icon = check.status === "ready" ? ShieldCheck : check.status === "blocked_non_critical" ? Laptop : TriangleAlert;

          return (
            <div className="check-row" key={check.name}>
              <span>
                <Icon aria-hidden="true" size={15} />
                {formatOpsValue("status", check.name)}
              </span>
              <StatusBadge label={labelFor(check.status)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
