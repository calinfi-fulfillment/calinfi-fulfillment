import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { ExceptionTriage } from "@/components/exception-triage";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Sorunlar"
      title="Sorun çözme masası"
      subtitle="Kargo fiyatı, ödeme veya ürün hazırlığını durduran konular burada tek tek sahibine atanır."
      steps={["Sorunu seç", "Sorumlusunu belirle", "Not ekle", "Çözüm hazırsa kontrol et"]}
    >
      <ExceptionTriage rows={data.exceptionRows} />

      <div className="popup-row">
        <DetailPopup buttonLabel="Sorun listesini aç" size="wide" title="Tüm sorunlar">
          <DataTable columns={["code", "severity", "owner", "age"]} rows={data.exceptionRows} />
        </DetailPopup>
      </div>
    </AppShell>
  );
}
