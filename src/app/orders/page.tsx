import { AppShell } from "@/components/app-shell";
import { OrdersWorkbench } from "@/components/orders-workbench";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Siparişler"
      title="Sipariş hazırlığı"
      subtitle="Burada her siparişin kargoya hazırlanması için adres, ürün ve rota durumunu kontrol edersin."
      steps={["Siparişi seç", "Adres ve ürün hazır mı bak", "Kargo yolunu seç", "Blokaj varsa beklet"]}
    >
      <OrdersWorkbench rows={data.orderRows} />
    </AppShell>
  );
}
