import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { DetailPopup } from "@/components/detail-popup";
import { PaymentEventWorkbench } from "@/components/payment-event-workbench";
import { StripeCheckoutReadinessPanel } from "@/components/stripe-checkout-readiness";
import { getOpsUiData } from "@/lib/ops-ui/live-data";
import { createStripeCheckoutReadiness } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const data = await getOpsUiData();
  const stripeReadiness = createStripeCheckoutReadiness();

  return (
    <AppShell
      active="Ödeme"
      title="Ödeme kontrolü"
      subtitle="Kargo ücreti ile ödeme haberi aynıysa sipariş kilitlenmeye hazır olur; uyuşmazlık varsa incelemeye düşer."
      steps={["Güncel fiyatı seç", "Test ödeme haberini kontrol et", "Tutar ve para birimi eşleşsin", "Eşleşirse kilit önizlemesi yap"]}
    >
      <PaymentEventWorkbench rows={data.paymentRows} />

      <div className="popup-row">
        <DetailPopup buttonLabel="Ödeme kuyruğu" size="wide" title="Kontrol bekleyen ödemeler">
          <DataTable columns={["sourceOrderKey", "quote", "status", "guard"]} rows={data.paymentRows} />
        </DetailPopup>
        <DetailPopup
          buttonLabel="Gelişmiş Stripe kontrolleri"
          intro="Bu kontrol gerçek tahsilat açmaz; canlı ödeme ve sipariş kilidi kapalıdır."
          title="Gelişmiş Stripe kontrolleri"
        >
          <StripeCheckoutReadinessPanel readiness={stripeReadiness} />
        </DetailPopup>
      </div>
    </AppShell>
  );
}
