import { AppShell } from "@/components/app-shell";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Raporlar"
      title="Genel durum raporu"
      subtitle="Bu ekran kişisel veri göstermeden kaç sipariş hazır, kaç sipariş blokajda ve kaç tanesi kargoya hazır sorularını cevaplar."
      steps={["Zaman aralığını seç", "Kargo yolunu filtrele", "Özeti üret", "Sadece güvenli toplamları dışa aktar"]}
    >
      <ReportsDashboard rows={data.reportRows} />
    </AppShell>
  );
}
