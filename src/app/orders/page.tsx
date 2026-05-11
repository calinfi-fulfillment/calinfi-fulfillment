import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { OrdersWorkbench } from "@/components/orders-workbench";
import { orderRows } from "@/lib/ops-ui/fixtures";

export default function OrdersPage() {
  return (
    <AppShell active="Orders" title="Orders" subtitle="Readiness, address, Product Master, and route state.">
      <div className="workflow-grid">
        <DataTable columns={["sourceOrderKey", "status", "address", "products", "route"]} rows={orderRows} />
        <OrdersWorkbench rows={orderRows} />
      </div>
    </AppShell>
  );
}
