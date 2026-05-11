import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PaymentEventWorkbench } from "@/components/payment-event-workbench";
import { paymentRows } from "@/lib/ops-ui/fixtures";

export default function PaymentsPage() {
  return (
    <AppShell active="Payments" title="Payments" subtitle="Signed event queue and mismatch review.">
      <div className="workflow-grid">
        <DataTable columns={["sourceOrderKey", "quote", "status", "guard"]} rows={paymentRows} />
        <PaymentEventWorkbench rows={paymentRows} />
      </div>
    </AppShell>
  );
}
