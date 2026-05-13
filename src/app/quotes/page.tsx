import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { ManualDdpQuote } from "@/components/manual-ddp-quote";
import { NetworkReadiness } from "@/components/network-readiness";
import { ProviderApiReadiness } from "@/components/provider-api-readiness";
import { quoteRows } from "@/lib/ops-ui/fixtures";

export default function QuotesPage() {
  return (
    <AppShell
      active="Kargo Ücreti"
      title="Kargo ücreti çıkar"
      subtitle="Bu ekranda siparişe uygun kargo yolunu görür, test fiyatı veya manuel DDP fiyatı hazırlarsın."
      steps={["Siparişi seç", "Kargo yolunu kontrol et", "Fiyatı önizle", "Canlı işlem kapalı kalsın"]}
    >
      <div className="split">
        <DataTable columns={["sourceOrderKey", "route", "mode", "quote", "expires"]} rows={quoteRows} />
        <div className="side-stack">
          <ManualDdpQuote />
          <NetworkReadiness />
          <ProviderApiReadiness />
        </div>
      </div>
    </AppShell>
  );
}
