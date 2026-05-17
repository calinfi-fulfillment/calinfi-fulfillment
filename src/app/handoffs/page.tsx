import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { HandoffWorkbench } from "@/components/handoff-workbench";
import { getOpsUiData } from "@/lib/ops-ui/live-data";

export const dynamic = "force-dynamic";

export default async function HandoffsPage() {
  const data = await getOpsUiData();

  return (
    <AppShell
      active="Teslim"
      title="Kargoya teslim hazırlığı"
      subtitle="Sadece ödemesi tamamlanmış ve kilitlenmiş siparişler burada kargo firmasına hazırlanır."
      steps={["Kilitli siparişleri seç", "Sandbox dosya hazırla", "Partner şemasını kontrol et", "Production etiketi ayrı kilitte tut"]}
    >
      <HandoffWorkbench guardRows={data.shippingGuardRows} rows={data.handoffRows} />

      <div className="popup-row">
        <DetailPopup buttonLabel="Teslim kuyruğu" size="wide" title="Kilitli siparişler">
          <DataTable columns={["sourceOrderKey", "route", "status", "exportType"]} rows={data.handoffRows} />
        </DetailPopup>
        <DetailPopup
          buttonLabel="Gelişmiş firma bağlantı kontrolleri"
          intro="Sandbox teslim/export kapısı açık; production partner push, etiket ve gerçek takip ayrı onay ister."
          title="Gelişmiş firma bağlantı kontrolleri"
        >
          <DataTable columns={["label", "status", "detail"]} rows={data.shippingGuardRows} />
        </DetailPopup>
      </div>
    </AppShell>
  );
}
