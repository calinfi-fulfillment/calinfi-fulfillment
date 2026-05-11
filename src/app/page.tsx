import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ActionList } from "@/components/action-list";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { LocalStagingModeReadiness } from "@/components/local-staging-mode-readiness";
import { OpsCommandCenter } from "@/components/ops-command-center";
import { QueueCard } from "@/components/queue-card";
import { ShippingConsole } from "@/components/shipping-console";
import { StagingPilotReadiness } from "@/components/staging-pilot-readiness";
import { cockpitQueues, nextActionRows, readinessRows, routeReviewRows } from "@/lib/ops-ui/fixtures";
import { areLiveMutationFlagsDisabled, hasFulfillmentSupabasePublicConfig, isPledgeManagerSupabaseUrl } from "@/lib/safety";
import { createStagingPrepReport, createSyntheticPilotImportPlan } from "@/lib/staging-prep";
import { createVercelBypassReport } from "@/lib/vercel-bypass";

export default function Home() {
  const blockedPmSupabase = isPledgeManagerSupabaseUrl();
  const liveFlagsOff = areLiveMutationFlagsDisabled();
  const publicSupabaseReady = hasFulfillmentSupabasePublicConfig();
  const stagingPrep = createStagingPrepReport();
  const vercelBypass = createVercelBypassReport();
  const stagingImportPlan = createSyntheticPilotImportPlan(readFileSync(join(process.cwd(), "fixtures/synthetic-pilot-orders.json"), "utf8"));
  const readinessCounts = {
    blocked: readinessRows.filter((row) => row.status === "blocker").length,
    ready: readinessRows.filter((row) => row.status === "ready").length,
    review: readinessRows.filter((row) => row.status === "review").length,
  };

  return (
    <AppShell
      active="Kontrol Paneli"
      title="Bugün ne yapacağız?"
      subtitle="Bu ekran siparişleri basit sıraya dizer: önce eksikleri çöz, sonra kargo fiyatı çıkar, ödeme tamamlanınca kargoya hazırla."
      steps={["Eksikleri bul", "Kargo fiyatını hazırla", "Ödeme durumunu kontrol et", "Kargoya verilecekleri ayır"]}
    >
      <section className="safety-strip" data-danger={blockedPmSupabase || !liveFlagsOff ? "true" : "false"}>
        <span>{blockedPmSupabase ? "PM verisi korunuyor" : liveFlagsOff ? "Canlı değişiklikler kapalı" : "Canlı ayarlar kontrol edilmeli"}</span>
        <span>{publicSupabaseReady ? "Fulfillment test veritabanı bağlı" : "Yerel önizleme modu"}</span>
        <span>Kargo firması, dışa aktarım ve partner gönderimi kapalı</span>
      </section>

      <ShippingConsole />

      <section className="queue-grid">
        {cockpitQueues.map((queue) => (
          <QueueCard count={queue.count} detail={queue.detail} key={queue.label} label={queue.label} tone={queue.tone} />
        ))}
        <QueueCard
          count={readinessCounts.blocked}
          detail={`${readinessCounts.ready} hazır, ${readinessCounts.review} kontrol, ${readinessCounts.blocked} blokaj.`}
          label="Ürün hazırlığı"
          tone={readinessCounts.blocked > 0 ? "danger" : "good"}
        />
      </section>

      <OpsCommandCenter actions={nextActionRows} queues={cockpitQueues} routes={routeReviewRows} />

      <div className="dashboard-grid">
        <LocalStagingModeReadiness report={vercelBypass} />
        <StagingPilotReadiness checks={stagingPrep.checks} importPlan={stagingImportPlan} mode={stagingPrep.mode} ok={stagingPrep.ok} />
      </div>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <p className="eyebrow">Next safe action</p>
            <h2>Sıradaki güvenli iş</h2>
          </div>
          <ActionList rows={nextActionRows} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <p className="eyebrow">Route review</p>
            <h2>Manuel kontrol isteyen rotalar</h2>
          </div>
          <DataTable columns={["sourceOrderKey", "country", "route", "payment", "action"]} rows={routeReviewRows} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Product Master</p>
          <h2>Ürün bilgi eksikleri</h2>
        </div>
        <DataTable columns={["sku", "title", "status", "packaging", "customs"]} rows={readinessRows} />
      </section>
    </AppShell>
  );
}
