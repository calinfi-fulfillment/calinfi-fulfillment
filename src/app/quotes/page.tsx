import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { ManualDdpQuote } from "@/components/manual-ddp-quote";
import { ProviderApiReadiness } from "@/components/provider-api-readiness";
import { quoteRows } from "@/lib/ops-ui/fixtures";

export default function QuotesPage() {
  return (
    <AppShell active="Quotes" title="Quotes" subtitle="Fresh quote queue with manual DDP capture.">
      <div className="split">
        <DataTable columns={["sourceOrderKey", "route", "mode", "quote", "expires"]} rows={quoteRows} />
        <div className="side-stack">
          <ManualDdpQuote />
          <ProviderApiReadiness />
        </div>
      </div>
    </AppShell>
  );
}
