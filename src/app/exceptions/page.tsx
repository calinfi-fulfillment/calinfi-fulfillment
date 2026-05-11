import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { ExceptionTriage } from "@/components/exception-triage";
import { exceptionRows } from "@/lib/ops-ui/fixtures";

export default function ExceptionsPage() {
  return (
    <AppShell active="Exceptions" title="Exceptions" subtitle="Operational blockers and review items.">
      <div className="workflow-grid">
        <DataTable columns={["code", "severity", "owner", "age"]} rows={exceptionRows} />
        <ExceptionTriage rows={exceptionRows} />
      </div>
    </AppShell>
  );
}
