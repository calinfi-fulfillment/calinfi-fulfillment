import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { ShippingConsole } from "@/components/shipping-console";
import { SfcAgreementBriefPanel } from "@/components/sfc-agreement-brief";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Kargo"
      title="Kargo merkezi"
      subtitle="Easyship tarzı tek ekranda gönderi hazırlığı: sipariş seç, paket ölçüsünü kontrol et, fiyat karşılaştır, etiket ve takip aksiyonlarını güvenli tut."
      steps={["Siparişi seç", "Paket bilgisini kontrol et", "Fiyatı karşılaştır", "Etiketi canlıya basma"]}
    >
      <ShippingConsole
        guardRows={data.shippingGuardRows}
        overviewRows={data.shippingOverviewRows}
        rateRows={data.shippingRateRows}
        shipmentRows={data.shipmentConsoleRows}
      />

      <div className="popup-row">
        <DetailPopup
          buttonLabel="Paketleme ve kargo ağı detayları"
          intro="Bu alan sadece kontrol ve önizleme içindir; canlı etiket, canlı gönderi ve partner push kapalı kalır."
          size="wide"
          title="Paketleme ve kargo ağı detayları"
        >
          <div className="modal-stack">
            <DataTable columns={["sourceOrderKey", "sku", "title", "quantity", "role", "builtin", "status"]} rows={data.orderLineRows} />
            <SfcAgreementBriefPanel />
          </div>
        </DetailPopup>
      </div>
    </AppShell>
  );
}
