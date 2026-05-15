import { AppShell } from "@/components/app-shell";
import { InventoryWorkbench } from "@/components/inventory-workbench";

export default function InventoryPage() {
  return (
    <AppShell
      active="Üretim & Stok"
      title="Üretim ve stok"
      subtitle="Üretilen, elde olan, rezerve edilen ve fulfillment planına ayrılabilecek SKU adetlerini kontrol edersin."
      steps={["SKU seç", "Üretim ve stok bak", "Talebi karşılaştır", "Fulfillment feed hazırla"]}
    >
      <InventoryWorkbench />
    </AppShell>
  );
}
