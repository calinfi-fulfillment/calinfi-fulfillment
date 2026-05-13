import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

import { createEasyshipReadiness } from "../src/lib/easyship";
import { areLiveMutationFlagsDisabled, isPledgeManagerSupabaseUrl } from "../src/lib/safety";
import { createSfcReadOnlySmokePlan, createSfcReadiness } from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const requiredDocs = [
  "docs/PROJECT_CHECKLIST.md",
  "docs/user-guide/ODUN_FULFILLMENT_USER_GUIDE.md",
  "docs/user-guide/ODUN_FULFILLMENT_KULLANIM_KILAVUZU.pdf",
  "docs/runbooks/STAGING_PILOT.md",
  "docs/runbooks/STAGING_SUPABASE_SETUP.md",
  "docs/runbooks/VERCEL_STAGING.md",
  "docs/runbooks/LOCAL_STAGING_WITHOUT_VERCEL.md",
  "docs/runbooks/ROLLBACK_FLAGS.md",
  "docs/runbooks/BACKUP_SNAPSHOT.md",
  "docs/runbooks/LAUNCH_READINESS.md",
  "docs/runbooks/SFC_READ_ONLY_SMOKE.md",
  "docs/architecture/SFC_EASYSHIP_NETWORK_PLAN.md",
  "docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md",
];

const requiredScripts = [
  "build",
  "lint",
  "typecheck",
  "test",
  "test:no-secrets",
  "test:sfc-network",
  "smoke:easyship-sandbox-rates",
  "smoke:sfc-read-only-plan",
  "smoke:sfc-read-only-api",
];

function packageScripts() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
  return packageJson.scripts ?? {};
}

function screenshotCount() {
  const assetsDir = "docs/user-guide/assets";
  if (!existsSync(assetsDir)) return 0;

  return readdirSync(assetsDir).filter((name) => /^\d{2}-.+\.png$/.test(name)).length;
}

function envValue(key: string) {
  return String(process.env[key] ?? "").trim();
}

function gitOutput(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const scripts = packageScripts();
const docChecks: Check[] = requiredDocs.map((path) => ({
  name: `doc:${path}`,
  ok: existsSync(path),
  detail: existsSync(path) ? "present" : "missing",
}));
const scriptChecks: Check[] = requiredScripts.map((name) => ({
  name: `script:${name}`,
  ok: Boolean(scripts[name]),
  detail: scripts[name] ? scripts[name] : "missing",
}));

const guideScreenshotCount = screenshotCount();
const easyshipReadiness = createEasyshipReadiness(process.env);
const sfcReadiness = createSfcReadiness(process.env);
const sfcSmokePlan = createSfcReadOnlySmokePlan({}, process.env);
const liveMutationSafe = areLiveMutationFlagsDisabled(process.env);
const pmSupabaseSafe = !isPledgeManagerSupabaseUrl(envValue("NEXT_PUBLIC_SUPABASE_URL"), process.env);
const easyshipShipmentSafe = envValue("EASYSHIP_ENABLE_SHIPMENTS") !== "true";
const easyshipTrackingSafe = envValue("EASYSHIP_ENABLE_TRACKING") !== "true";
const sfcMutationSafe = envValue("SFC_ENABLE_MUTATIONS") !== "true";
const gitStatus = gitOutput(["status", "--porcelain"]);
const gitBranch = gitOutput(["branch", "--show-current"]);
const gitUpstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
const gitAheadCount = Number(gitOutput(["rev-list", "--count", "@{u}..HEAD"]) || "0");

const checks: Check[] = [
  ...docChecks,
  {
    name: "guide:screenshots",
    ok: guideScreenshotCount >= 8,
    detail: `${guideScreenshotCount} guide screenshots found`,
  },
  ...scriptChecks,
  {
    name: "pm-supabase-boundary",
    ok: pmSupabaseSafe,
    detail: pmSupabaseSafe ? "Fulfillment is not configured against the blocked PM Supabase ref." : "Fulfillment points at the blocked PM Supabase ref.",
  },
  {
    name: "live-mutation-flags-disabled",
    ok: liveMutationSafe,
    detail: liveMutationSafe ? "Core live mutation flags are disabled." : "At least one core live mutation flag is enabled.",
  },
  {
    name: "easyship-non-mutation-flags",
    ok: easyshipReadiness.mode !== "production" && easyshipShipmentSafe && easyshipTrackingSafe,
    detail:
      easyshipReadiness.mode === "production"
        ? "Easyship production mode is blocked for this phase."
        : `Easyship mode is ${easyshipReadiness.mode}; shipment=${envValue("EASYSHIP_ENABLE_SHIPMENTS") || "false"}, tracking=${
            envValue("EASYSHIP_ENABLE_TRACKING") || "false"
          }.`,
  },
  {
    name: "sfc-mutations-disabled",
    ok: sfcMutationSafe && sfcReadiness.code !== "sfc_mutation_blocked",
    detail: sfcMutationSafe ? "SFC mutation flag is disabled." : "SFC mutation flag is enabled.",
  },
  {
    name: "sfc-read-only-plan-safe",
    ok: sfcSmokePlan.requests.every((request) => request.mutation === false && request.externalActions === "none"),
    detail: `SFC plan actions: ${sfcSmokePlan.requests.map((request) => request.action).join(", ")}`,
  },
];

const launchBlockers = [
  ...(gitStatus ? ["Local changes still need an intentional commit."] : []),
  ...(!gitUpstream
    ? ["Current branch has no upstream remote tracking branch."]
    : gitAheadCount > 0
      ? [`Current branch ${gitBranch || "(unknown)"} is ${gitAheadCount} commit(s) ahead of ${gitUpstream}; push is still required.`]
      : []),
  "Vercel Git integration/account alignment is not confirmed.",
  "Protected preview smoke must be rerun after the latest changes are deployed.",
  "PM production read-only aggregate baseline still requires approved scope.",
  "Stripe real test account/env verification is still pending.",
  easyshipReadiness.code === "easyship_sandbox_ready"
    ? "Easyship sandbox env is ready, but /rates still needs HTTP 200 evidence after token/scope correction."
    : `Easyship sandbox readiness is ${easyshipReadiness.code}.`,
  sfcSmokePlan.ok
    ? "SFC read-only plan is ready, but real read-only API smoke still needs HTTP 200 evidence."
    : `SFC read-only smoke is ${sfcSmokePlan.code}; valid read-only credentials/env are still required.`,
  "Formal pre-pilot Sınır Bekçisi audit is still pending.",
  "Production environment, backup timing, final audit, owner go/no-go, and production smoke are still pending.",
];

const okForLocalPackage = checks.every((check) => check.ok);
const okForProductionLaunch = okForLocalPackage && launchBlockers.length === 0;

console.log(
  JSON.stringify(
    {
      ok: okForLocalPackage,
      checked: "completion-readiness",
      okForLocalPackage,
      okForProductionLaunch,
      checks,
      providerReadiness: {
        easyship: {
          mode: easyshipReadiness.mode,
          code: easyshipReadiness.code,
          apiBaseUrl: easyshipReadiness.apiBaseUrl,
        },
        sfc: {
          mode: sfcReadiness.mode,
          code: sfcReadiness.code,
          smokePlanCode: sfcSmokePlan.code,
          actions: sfcSmokePlan.requests.map((request) => request.action),
        },
      },
      docs: {
        requiredCount: requiredDocs.length,
        screenshotCount: guideScreenshotCount,
      },
      git: {
        branch: gitBranch || "unknown",
        upstream: gitUpstream || "missing",
        clean: !gitStatus,
        aheadCount: Number.isFinite(gitAheadCount) ? gitAheadCount : null,
      },
      launchBlockers,
      externalActions: "none",
    },
    null,
    2,
  ),
);

if (!okForLocalPackage) {
  process.exitCode = 1;
}
