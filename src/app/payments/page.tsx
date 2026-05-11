import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PaymentEventWorkbench } from "@/components/payment-event-workbench";
import { StripeCheckoutReadinessPanel } from "@/components/stripe-checkout-readiness";
import { paymentRows } from "@/lib/ops-ui/fixtures";
import { createStripeCheckoutReadiness } from "@/lib/stripe-checkout";

export default function PaymentsPage() {
  const stripeReadiness = createStripeCheckoutReadiness();

  return (
    <AppShell
      active="Ödemeler"
      title="Ödeme kontrolü"
      subtitle="Kargo ücreti ile ödeme haberi aynıysa sipariş kilitlenmeye hazır olur; uyuşmazlık varsa incelemeye düşer."
      steps={["Güncel fiyatı seç", "Test ödeme haberini kontrol et", "Tutar ve para birimi eşleşsin", "Eşleşirse kilit önizlemesi yap"]}
    >
      <div className="workflow-grid">
        <DataTable columns={["sourceOrderKey", "quote", "status", "guard"]} rows={paymentRows} />
        <div className="side-stack">
          <StripeCheckoutReadinessPanel readiness={stripeReadiness} />
          <PaymentEventWorkbench rows={paymentRows} />
        </div>
      </div>
    </AppShell>
  );
}
