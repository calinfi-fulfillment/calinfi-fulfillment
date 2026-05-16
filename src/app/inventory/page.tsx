import { AppShell } from "@/components/app-shell";
import { InventoryWorkbench } from "@/components/inventory-workbench";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Stok"
      title="Üretim ve stok"
      subtitle="Üretilen, elde olan, rezerve edilen ve fulfillment planına ayrılabilecek SKU adetlerini kontrol edersin."
      steps={["SKU seç", "Stoka bak", "Talebi karşılaştır", "Ayrılabilir stoku önizle"]}
    >
      <InventoryWorkbench demandRows={data.inventoryDemandRows} supplyRows={data.inventorySupplyRows} />
    </AppShell>
  );
}
