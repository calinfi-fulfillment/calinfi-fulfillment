import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { HandoffWorkbench } from "@/components/handoff-workbench";
import { ProviderApiReadiness } from "@/components/provider-api-readiness";
import { handoffRows } from "@/lib/ops-ui/fixtures";

export default function HandoffsPage() {
  return (
    <AppShell active="Handoffs" title="Handoffs" subtitle="Only paid locked orders become export-ready.">
      <div className="workflow-grid">
        <DataTable columns={["sourceOrderKey", "route", "status", "exportType"]} rows={handoffRows} />
        <div className="side-stack">
          <HandoffWorkbench rows={handoffRows} />
          <ProviderApiReadiness />
        </div>
      </div>
    </AppShell>
  );
}
