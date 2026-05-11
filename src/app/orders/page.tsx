import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { OrdersWorkbench } from "@/components/orders-workbench";
import { orderRows } from "@/lib/ops-ui/fixtures";

export default function OrdersPage() {
  return (
    <AppShell
      active="Siparişler"
      title="Sipariş hazırlığı"
      subtitle="Burada her siparişin kargoya hazırlanması için adres, ürün ve rota durumunu kontrol edersin."
      steps={["Siparişi seç", "Adres ve ürün hazır mı bak", "Kargo yolunu seç", "Blokaj varsa beklet"]}
    >
      <div className="workflow-grid">
        <DataTable columns={["sourceOrderKey", "status", "address", "products", "route"]} rows={orderRows} />
        <OrdersWorkbench rows={orderRows} />
      </div>
    </AppShell>
  );
}
