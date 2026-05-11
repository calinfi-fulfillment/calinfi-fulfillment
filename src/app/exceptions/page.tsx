import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { ExceptionTriage } from "@/components/exception-triage";
import { exceptionRows } from "@/lib/ops-ui/fixtures";

export default function ExceptionsPage() {
  return (
    <AppShell
      active="Sorunlar"
      title="Sorun çözme masası"
      subtitle="Kargo fiyatı, ödeme veya ürün hazırlığını durduran konular burada tek tek sahibine atanır."
      steps={["Sorunu seç", "Sorumlusunu belirle", "Not ekle", "Çözüm hazırsa kontrol et"]}
    >
      <div className="workflow-grid">
        <DataTable columns={["code", "severity", "owner", "age"]} rows={exceptionRows} />
        <ExceptionTriage rows={exceptionRows} />
      </div>
    </AppShell>
  );
}
