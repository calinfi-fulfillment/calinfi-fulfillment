"use client";

import { ClipboardCheck, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";
import type { StagingPrepCheck, SyntheticPilotImportPlan } from "@/lib/staging-prep";

type StagingPilotReadinessProps = {
  checks: readonly StagingPrepCheck[];
  importPlan: SyntheticPilotImportPlan;
  mode: string;
  ok: boolean;
};

export function StagingPilotReadiness({ checks, importPlan, mode, ok }: StagingPilotReadinessProps) {
  const [event, setEvent] = useState("Henüz pilot testi başlatılmadı");
  const blockedChecks = checks.filter((check) => !check.ok && check.severity === "blocking");

  return (
    <section className="workbench-panel" data-testid="staging-pilot-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Pilot hazırlığı</p>
          <h2>Teste hazır mıyız?</h2>
        </div>
        <StatusBadge label={ok ? mode : "blocked"} />
      </div>

      <div className="queue-grid compact">
        <article className="mini-metric">
          <span>Test siparişi</span>
          <strong>{importPlan.orders}</strong>
          <small>{importPlan.fixtureSafe ? "Kişisel veri yok" : "Test verisi kontrol edilmeli"}</small>
        </article>
        <article className="mini-metric">
          <span>Kargo önizlemesi</span>
          <strong>{importPlan.exportedPreviewRows}</strong>
          <small>canlı dosya yazmadan</small>
        </article>
        <article className="mini-metric">
          <span>Kutu içi ürün</span>
          <strong>{importPlan.excludedBuiltinItems}</strong>
          <small>ayrı paketlenmez</small>
        </article>
        <article className="mini-metric">
          <span>Blokaj</span>
          <strong>{blockedChecks.length}</strong>
          <small>DB/API değişmedi</small>
        </article>
      </div>

      <div className="checklist">
        {checks.map((check) => (
          <div className="check-row" key={check.name}>
            <span>
              <ShieldCheck aria-hidden="true" size={15} />
              {formatOpsValue("status", check.name)}
            </span>
            <StatusBadge label={check.ok ? "ready" : check.severity} />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button onClick={() => setEvent(`${importPlan.orders} test siparişi ve ${importPlan.exportedPreviewRows} kargo satırı önizlendi`)} type="button">
          <PlayCircle aria-hidden="true" size={16} />
          Test pilotu çalıştır
        </button>
        <button className="button-secondary" onClick={() => setEvent(`${blockedChecks.length} blokaj kontrol için hazır`)} type="button">
          <ClipboardCheck aria-hidden="true" size={16} />
          Blokajları göster
        </button>
        <button className="button-secondary" onClick={() => setEvent("Owner onay paketi yerelde hazırlandı")} type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Onay paketini hazırla
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Test Supabase bağla
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Stripe canlı
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Firmaya canlı gönder
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {event}
      </p>
    </section>
  );
}
