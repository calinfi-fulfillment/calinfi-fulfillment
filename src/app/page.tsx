import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ActionList } from "@/components/action-list";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { OpsCommandCenter } from "@/components/ops-command-center";
import { QueueCard } from "@/components/queue-card";
import { StagingPilotReadiness } from "@/components/staging-pilot-readiness";
import { cockpitQueues, nextActionRows, readinessRows, routeReviewRows } from "@/lib/ops-ui/fixtures";
import { areLiveMutationFlagsDisabled, hasFulfillmentSupabasePublicConfig, isPledgeManagerSupabaseUrl } from "@/lib/safety";
import { createStagingPrepReport, createSyntheticPilotImportPlan } from "@/lib/staging-prep";

export default function Home() {
  const blockedPmSupabase = isPledgeManagerSupabaseUrl();
  const liveFlagsOff = areLiveMutationFlagsDisabled();
  const publicSupabaseReady = hasFulfillmentSupabasePublicConfig();
  const stagingPrep = createStagingPrepReport();
  const stagingImportPlan = createSyntheticPilotImportPlan(readFileSync(join(process.cwd(), "fixtures/synthetic-pilot-orders.json"), "utf8"));
  const readinessCounts = {
    blocked: readinessRows.filter((row) => row.status === "blocker").length,
    ready: readinessRows.filter((row) => row.status === "ready").length,
    review: readinessRows.filter((row) => row.status === "review").length,
  };
  const readinessSummary = `${readinessCounts.ready} ready, ${readinessCounts.review} review, ${readinessCounts.blocked} blocked.`;

  return (
    <AppShell
      active="Cockpit"
      title="Ops Cockpit"
      subtitle="Founder/admin queue view for Phase 2 readiness, payment lock, and handoff safety."
    >
      <section className="safety-strip" data-danger={blockedPmSupabase || !liveFlagsOff ? "true" : "false"}>
        <span>{blockedPmSupabase ? "PM Supabase blocked" : liveFlagsOff ? "Live mutation flags off" : "Review live flags"}</span>
        <span>{publicSupabaseReady ? "Fulfillment Supabase configured" : "Preview/local mode"}</span>
        <span>Provider, export, and partner push disabled</span>
      </section>

      <section className="queue-grid">
        {cockpitQueues.map((queue) => (
          <QueueCard count={queue.count} detail={queue.detail} key={queue.label} label={queue.label} tone={queue.tone} />
        ))}
        <QueueCard
          count={readinessCounts.blocked}
          detail={readinessSummary}
          label="Product readiness"
          tone={readinessCounts.blocked > 0 ? "danger" : "good"}
        />
      </section>

      <OpsCommandCenter actions={nextActionRows} queues={cockpitQueues} routes={routeReviewRows} />

      <StagingPilotReadiness checks={stagingPrep.checks} importPlan={stagingImportPlan} mode={stagingPrep.mode} ok={stagingPrep.ok} />

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <p className="eyebrow">Next safe action</p>
            <h2>Ops queue</h2>
          </div>
          <ActionList rows={nextActionRows} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <p className="eyebrow">Route review</p>
            <h2>DDP and manual candidates</h2>
          </div>
          <DataTable columns={["sourceOrderKey", "country", "route", "payment", "action"]} rows={routeReviewRows} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Product Master</p>
          <h2>Readiness blockers</h2>
        </div>
        <DataTable columns={["sku", "title", "status", "packaging", "customs"]} rows={readinessRows} />
      </section>
    </AppShell>
  );
}
