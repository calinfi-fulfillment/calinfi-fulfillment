import { AppShell } from "@/components/app-shell";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { reportRows } from "@/lib/ops-ui/fixtures";

export default function ReportsPage() {
  return (
    <AppShell active="Reports" title="Reports" subtitle="PII-safe aggregate summaries.">
      <ReportsDashboard rows={reportRows} />
    </AppShell>
  );
}
