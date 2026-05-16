import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { GuidedQuoteWorkflow } from "@/components/guided-quote-workflow";
import { ManualDdpQuote } from "@/components/manual-ddp-quote";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Fiyat"
      title="Kargo fiyat kararları"
      subtitle="Siparişin kargo yolu sistem tarafından ayrılır; sen sadece fiyatı hazır olanı seçer veya DDP için bekleyen tek aksiyonu görürsün."
      steps={["Fiyat bekleyenleri gör", "Sistem kararını kontrol et", "Güvenli fiyatı seç", "Canlı işlemi kapalı tut"]}
    >
      <GuidedQuoteWorkflow rows={data.quoteRows} />

      <div className="popup-row">
        <DetailPopup buttonLabel="Fiyat kuyruğu" size="wide" title="Tüm bekleyen fiyat işleri">
          <DataTable columns={["sourceOrderKey", "route", "mode", "quote", "expires"]} rows={data.quoteRows} />
        </DetailPopup>
        <DetailPopup
          buttonLabel="Gelişmiş fiyat ve sağlayıcı kontrolleri"
          intro="Manuel DDP, network ve provider kontrolleri burada durur; günlük akışı kalabalıklaştırmaz."
          size="wide"
          title="Gelişmiş fiyat ve sağlayıcı kontrolleri"
        >
          <div className="modal-stack">
            <ManualDdpQuote orders={data.quoteRows} />
            <DataTable columns={["sourceOrderKey", "sku", "title", "quantity", "role", "builtin", "status"]} rows={data.orderLineRows} />
          </div>
        </DetailPopup>
      </div>
    </AppShell>
  );
}
