import { AppShell } from "@/components/app-shell";
import { ShippingConsole } from "@/components/shipping-console";

export default function ShippingPage() {
  return (
    <AppShell
      active="Kargo Merkezi"
      title="Kargo merkezi"
      subtitle="Easyship tarzı tek ekranda gönderi hazırlığı: sipariş seç, paket ölçüsünü kontrol et, fiyat karşılaştır, etiket ve takip aksiyonlarını güvenli tut."
      steps={["Siparişi seç", "Paket bilgisini kontrol et", "Fiyatı karşılaştır", "Etiketi canlıya basma"]}
    >
      <ShippingConsole />
    </AppShell>
  );
}
