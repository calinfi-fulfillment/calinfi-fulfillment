import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { LocalStagingModeReadiness } from "@/components/local-staging-mode-readiness";
import { OpsCommandCenter } from "@/components/ops-command-center";
import { QueueCard } from "@/components/queue-card";
import { getOpsUiData } from "@/lib/ops-ui/live-data";
import { hasFulfillmentSupabasePublicConfig, isPledgeManagerSupabaseUrl, liveMutationFlags } from "@/lib/safety";
import { createVercelBypassReport } from "@/lib/vercel-bypass";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOpsUiData();
  const blockedPmSupabase = isPledgeManagerSupabaseUrl();
  const flags = liveMutationFlags();
  const downstreamFlagsOff =
    !flags.FULFILLMENT_ENABLE_PROVIDER_API_QUOTES &&
    !flags.FULFILLMENT_ENABLE_STRIPE_CHECKOUT &&
    !flags.FULFILLMENT_ENABLE_HANDOFF_EXPORTS &&
    !flags.FULFILLMENT_ENABLE_PARTNER_API_PUSH;
  const downstreamSandboxOpen = !downstreamFlagsOff;
  const publicSupabaseReady = hasFulfillmentSupabasePublicConfig();
  const vercelBypass = createVercelBypassReport();
  const readinessCounts = {
    blocked: data.readinessRows.filter((row) => row.status === "blocked").length,
    ready: data.readinessRows.filter((row) => row.status === "ready").length,
    review: data.readinessRows.filter((row) => row.status === "needs_review").length,
  };

  return (
    <AppShell
      active="Bugün"
      title="Bugün ne yapacağız?"
      subtitle="Bu ekran siparişleri basit sıraya dizer: önce eksikleri çöz, sonra kargo fiyatı çıkar, ödeme tamamlanınca kargoya hazırla."
      steps={["Eksikleri bul", "Kargo fiyatını hazırla", "Ödeme durumunu kontrol et", "Kargoya verilecekleri ayır"]}
    >
      <section className="safety-strip" data-danger={blockedPmSupabase ? "true" : "false"}>
        <span>{data.connection.mode === "live" ? "PM intake bağlı" : data.connection.message}</span>
        <span>{publicSupabaseReady ? "Fulfillment staging veritabanı bağlı" : "Fulfillment veritabanı bağlı değil"}</span>
        <span>{downstreamSandboxOpen ? "Sandbox kargo/ödeme/teslim kapıları açık" : "Kargo firması, dışa aktarım ve partner gönderimi kapalı"}</span>
      </section>

      <section className="queue-grid">
        {data.cockpitQueues.map((queue) => (
          <QueueCard count={queue.count} detail={queue.detail} key={queue.label} label={queue.label} tone={queue.tone} />
        ))}
        <QueueCard
          count={readinessCounts.blocked}
          detail={`${readinessCounts.ready} hazır, ${readinessCounts.review} kontrol, ${readinessCounts.blocked} blokaj.`}
          label="Ürün hazırlığı"
          tone={readinessCounts.blocked > 0 ? "danger" : "good"}
        />
      </section>

      <section className="panel shipping-shortcut">
        <div>
          <p className="eyebrow">Kargo Merkezi</p>
          <h2>Kargo hazırlığı ayrı ekranda</h2>
          <p>Sipariş seçme, paket ölçüsü, kargo fiyat kartları ve canlı etiket güvenlik kontrolleri tek sayfada toplandı.</p>
        </div>
        <Link className="button-link" href="/shipping">
          Kargo Merkezi&apos;ni aç
        </Link>
      </section>

      <OpsCommandCenter actions={data.nextActionRows} queues={data.cockpitQueues} routes={data.routeReviewRows} />

      <div className="popup-row">
        <DetailPopup buttonLabel="Rota detayları" size="wide" title="Manuel kontrol isteyen rotalar">
          <DataTable columns={["sourceOrderKey", "country", "route", "payment", "action"]} rows={data.routeReviewRows} />
        </DetailPopup>
        <DetailPopup buttonLabel="Ürün detayları" size="wide" title="Ürün bilgi eksikleri">
          <DataTable columns={["sku", "title", "status", "packaging", "customs"]} rows={data.readinessRows} />
        </DetailPopup>
        <DetailPopup
          buttonLabel="Test ortamı detayları"
          intro="Bu kontroller canlı kargo, ödeme veya partner işlemi açmaz; Fulfillment bağlantı ve güvenlik kapılarını gösterir."
          size="wide"
          title="Test ortamı"
        >
          <div className="modal-stack">
            <section className="connection-card">
              <p className="eyebrow">Veri kaynağı</p>
              <h2>{data.connection.source}</h2>
              <p>{data.connection.message}</p>
              <strong>{data.connection.orderCount} PM siparişi okunuyor</strong>
            </section>
            <LocalStagingModeReadiness report={vercelBypass} />
          </div>
        </DetailPopup>
      </div>
    </AppShell>
  );
}
