import { AppShell } from "@/components/app-shell";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { reportRows } from "@/lib/ops-ui/fixtures";

export default function ReportsPage() {
  return (
    <AppShell
      active="Raporlar"
      title="Genel durum raporu"
      subtitle="Bu ekran kişisel veri göstermeden kaç sipariş hazır, kaç sipariş blokajda ve kaç tanesi kargoya hazır sorularını cevaplar."
      steps={["Zaman aralığını seç", "Kargo yolunu filtrele", "Özeti üret", "Sadece güvenli toplamları dışa aktar"]}
    >
      <ReportsDashboard rows={reportRows} />
    </AppShell>
  );
}
