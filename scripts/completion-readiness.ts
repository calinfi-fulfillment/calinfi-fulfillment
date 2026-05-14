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
  "docs/runbooks/SFC_NEGOTIATION_BRIEF.md",
  "docs/architecture/SFC_EASYSHIP_NETWORK_PLAN.md",
  "docs/evidence/EASYSHIP_SANDBOX_RATES_2026-05-14.json",
  "docs/evidence/SFC_READ_ONLY_SMOKE_2026-05-14.json",
  "docs/evidence/STRIPE_CLI_CHECKOUT_2026-05-14.json",
  "docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md",
];

const requiredScripts = [
  "build",
  "lint",
  "typecheck",
  "check:easyship-sandbox-env",
  "check:sfc-read-only-env",
  "test",
  "test:no-secrets",
  "test:sfc-network",
  "smoke:easyship-sandbox-rates",
  "smoke:stripe-restricted-key-checkout",
  "smoke:sfc-read-only-plan",
  "smoke:sfc-read-only-api",
  "smoke:sfc-product-visibility",
];

type SfcReadOnlySmokeEvidence = {
  provider?: string;
  checkedAt?: string;
  mode?: string;
  mutationBoundary?: {
    sfcEnableMutations?: boolean;
    externalActions?: string;
    mutatingActions?: string[];
  };
  readOnlyApiSmoke?: {
    ok?: boolean;
    actions?: string[];
    soapFaults?: number;
    wsdlDocumentResponses?: number;
    credentialEchoes?: number;
    rawSoapStored?: boolean;
  };
  productVisibility?: {
    ok?: boolean;
    checkedSkus?: number;
    visibleSkus?: number;
    missingSkus?: number;
    soapFaults?: number;
    wsdlDocumentResponses?: number;
    credentialEchoes?: number;
    rawSoapStored?: boolean;
  };
};

type EasyshipSandboxRatesEvidence = {
  provider?: string;
  checkedAt?: string;
  mode?: string;
  apiVersion?: string;
  mutationBoundary?: {
    easyshipEnableRates?: boolean;
    easyshipEnableShipments?: boolean;
    easyshipEnableTracking?: boolean;
    fulfillmentEnablePartnerApiPush?: boolean;
    externalActions?: string;
    mutatingActions?: string[];
  };
  ratesSmoke?: {
    ok?: boolean;
    endpoint?: string;
    status?: number;
    rateCount?: number;
    payload?: string;
    rawResponseStored?: boolean;
    credentialEchoes?: number;
  };
};

type StripeTestCheckoutEvidence = {
  provider?: string;
  checkedAt?: string;
  mode?: string;
  webhookSecret?: {
    configuredInIgnoredLocalEnv?: boolean;
    rawValueStoredInRepo?: boolean;
  };
  publishableKey?: {
    configuredInIgnoredLocalEnv?: boolean;
    prefix?: string;
    rawValueStoredInRepo?: boolean;
  };
  restrictedKey?: {
    configuredInIgnoredLocalEnv?: boolean;
    prefix?: string;
    rawValueStoredInRepo?: boolean;
  };
  checkoutSessionSmoke?: {
    ok?: boolean;
    sessionId?: string;
    livemode?: boolean;
    paymentStatus?: string;
    paymentMethodTypesSentByApp?: boolean;
    rawCheckoutUrlStored?: boolean;
  };
  appRestrictedKeyCheckoutSmoke?: {
    ok?: boolean;
    sessionId?: string;
    livemode?: boolean;
    readinessCodeWithCheckoutEnabled?: string;
    persistedCheckoutFlag?: boolean;
    rawCheckoutUrlStored?: boolean;
  };
  mutationBoundary?: {
    stripeMode?: string;
    fulfillmentEnableStripeCheckout?: boolean;
    externalActions?: string;
    livePaymentActions?: string[];
    chargesCaptured?: number;
  };
};

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

function loadSfcSmokeEvidence(): SfcReadOnlySmokeEvidence | null {
  const evidencePath = "docs/evidence/SFC_READ_ONLY_SMOKE_2026-05-14.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as SfcReadOnlySmokeEvidence;
  } catch {
    return null;
  }
}

function loadEasyshipRatesEvidence(): EasyshipSandboxRatesEvidence | null {
  const evidencePath = "docs/evidence/EASYSHIP_SANDBOX_RATES_2026-05-14.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as EasyshipSandboxRatesEvidence;
  } catch {
    return null;
  }
}

function loadStripeTestEvidence(): StripeTestCheckoutEvidence | null {
  const evidencePath = "docs/evidence/STRIPE_CLI_CHECKOUT_2026-05-14.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as StripeTestCheckoutEvidence;
  } catch {
    return null;
  }
}

function sfcEvidenceReady(evidence: SfcReadOnlySmokeEvidence | null) {
  if (!evidence) return false;

  const readOnly = evidence.readOnlyApiSmoke;
  const visibility = evidence.productVisibility;
  const boundary = evidence.mutationBoundary;

  return Boolean(
    evidence.provider === "sendfromchina" &&
      evidence.mode === "read_only" &&
      readOnly?.ok &&
      visibility?.ok &&
      visibility.checkedSkus === visibility.visibleSkus &&
      visibility.missingSkus === 0 &&
      readOnly.soapFaults === 0 &&
      readOnly.wsdlDocumentResponses === 0 &&
      readOnly.credentialEchoes === 0 &&
      readOnly.rawSoapStored === false &&
      visibility.soapFaults === 0 &&
      visibility.wsdlDocumentResponses === 0 &&
      visibility.credentialEchoes === 0 &&
      visibility.rawSoapStored === false &&
      boundary?.sfcEnableMutations === false &&
      boundary.externalActions === "read_only_provider_api_only" &&
      Array.isArray(boundary.mutatingActions) &&
      boundary.mutatingActions.length === 0,
  );
}

function easyshipEvidenceReady(evidence: EasyshipSandboxRatesEvidence | null) {
  if (!evidence) return false;

  const rates = evidence.ratesSmoke;
  const boundary = evidence.mutationBoundary;

  return Boolean(
    evidence.provider === "easyship" &&
      evidence.mode === "sandbox" &&
      evidence.apiVersion === "2024-09" &&
      rates?.ok &&
      rates.endpoint === "https://public-api-sandbox.easyship.com/2024-09/rates" &&
      rates.status === 200 &&
      typeof rates.rateCount === "number" &&
      rates.rateCount > 0 &&
      rates.payload === "synthetic_non_pii_odun_rate_request" &&
      rates.rawResponseStored === false &&
      rates.credentialEchoes === 0 &&
      boundary?.easyshipEnableRates === true &&
      boundary.easyshipEnableShipments === false &&
      boundary.easyshipEnableTracking === false &&
      boundary.fulfillmentEnablePartnerApiPush === false &&
      boundary.externalActions === "sandbox_rates_only" &&
      Array.isArray(boundary.mutatingActions) &&
      boundary.mutatingActions.length === 0,
  );
}

function stripeEvidenceReady(evidence: StripeTestCheckoutEvidence | null) {
  if (!evidence) return false;

  const cliSmoke = evidence.checkoutSessionSmoke;
  const appSmoke = evidence.appRestrictedKeyCheckoutSmoke;
  const boundary = evidence.mutationBoundary;

  return Boolean(
    evidence.provider === "stripe" &&
      evidence.mode === "test" &&
      evidence.webhookSecret?.configuredInIgnoredLocalEnv === true &&
      evidence.webhookSecret.rawValueStoredInRepo === false &&
      evidence.publishableKey?.configuredInIgnoredLocalEnv === true &&
      evidence.publishableKey.prefix === "pk_test_" &&
      evidence.publishableKey.rawValueStoredInRepo === false &&
      evidence.restrictedKey?.configuredInIgnoredLocalEnv === true &&
      evidence.restrictedKey.prefix === "rk_test_" &&
      evidence.restrictedKey.rawValueStoredInRepo === false &&
      cliSmoke?.ok === true &&
      cliSmoke.livemode === false &&
      cliSmoke.paymentStatus === "unpaid" &&
      cliSmoke.paymentMethodTypesSentByApp === false &&
      cliSmoke.rawCheckoutUrlStored === false &&
      appSmoke?.ok === true &&
      appSmoke.livemode === false &&
      appSmoke.readinessCodeWithCheckoutEnabled === "stripe_checkout_ready" &&
      appSmoke.persistedCheckoutFlag === false &&
      appSmoke.rawCheckoutUrlStored === false &&
      boundary?.stripeMode === "test" &&
      boundary.fulfillmentEnableStripeCheckout === false &&
      boundary.externalActions === "stripe_test_checkout_session_create_only" &&
      Array.isArray(boundary.livePaymentActions) &&
      boundary.livePaymentActions.length === 0 &&
      boundary.chargesCaptured === 0,
  );
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
const easyshipRatesEvidence = loadEasyshipRatesEvidence();
const easyshipRatesEvidenceReady = easyshipEvidenceReady(easyshipRatesEvidence);
const stripeTestEvidence = loadStripeTestEvidence();
const stripeTestEvidenceReady = stripeEvidenceReady(stripeTestEvidence);
const sfcSmokeEvidence = loadSfcSmokeEvidence();
const sfcSmokeEvidenceReady = sfcEvidenceReady(sfcSmokeEvidence);
const liveMutationSafe = areLiveMutationFlagsDisabled(process.env);
const pmSupabaseSafe = !isPledgeManagerSupabaseUrl(envValue("NEXT_PUBLIC_SUPABASE_URL"), process.env);
const easyshipShipmentSafe = envValue("EASYSHIP_ENABLE_SHIPMENTS") !== "true";
const easyshipTrackingSafe = envValue("EASYSHIP_ENABLE_TRACKING") !== "true";
const sfcMutationSafe = envValue("SFC_ENABLE_MUTATIONS") !== "true";
const sfcCertificateReviewed = envValue("SFC_CERT_ROTATED_CONFIRMED") === "true";
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
    name: "easyship-sandbox-rates-evidence",
    ok: easyshipRatesEvidenceReady,
    detail: easyshipRatesEvidenceReady
      ? `Easyship sandbox rates evidence present from ${easyshipRatesEvidence?.checkedAt}; ${easyshipRatesEvidence?.ratesSmoke?.rateCount} rates returned.`
      : "Easyship sandbox rates evidence is missing or incomplete.",
  },
  {
    name: "stripe-test-checkout-evidence",
    ok: stripeTestEvidenceReady,
    detail: stripeTestEvidenceReady
      ? `Stripe test checkout evidence present from ${stripeTestEvidence?.checkedAt}; app restricted-key smoke passed.`
      : "Stripe test checkout evidence is missing or incomplete.",
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
  {
    name: "sfc-read-only-evidence",
    ok: sfcSmokeEvidenceReady,
    detail: sfcSmokeEvidenceReady
      ? `SFC read-only smoke evidence present from ${sfcSmokeEvidence?.checkedAt}; ${sfcSmokeEvidence?.productVisibility?.visibleSkus}/${sfcSmokeEvidence?.productVisibility?.checkedSkus} SKUs visible.`
      : "SFC read-only smoke evidence is missing or incomplete.",
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
  ...(!stripeTestEvidenceReady ? ["Stripe test checkout evidence is still pending."] : []),
  ...(!easyshipRatesEvidenceReady
    ? [
        easyshipReadiness.code === "easyship_sandbox_ready"
          ? "Easyship sandbox env is ready, but /rates still needs HTTP 200 evidence after token/scope correction."
          : `Easyship sandbox readiness is ${easyshipReadiness.code}.`,
      ]
    : []),
  ...(!sfcSmokeEvidenceReady
    ? [
        sfcSmokePlan.ok
          ? "SFC read-only plan is ready, but real read-only API smoke still needs HTTP 200 evidence."
          : `SFC read-only smoke is ${sfcSmokePlan.code}; valid read-only credentials/env are still required.`,
      ]
    : []),
  ...(!sfcCertificateReviewed ? ["SFC certificate rotation/review confirmation is still required before pilot/prod smoke."] : []),
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
          evidence: easyshipRatesEvidence
            ? {
                checkedAt: easyshipRatesEvidence.checkedAt,
                ok: easyshipRatesEvidenceReady,
                rateCount: easyshipRatesEvidence.ratesSmoke?.rateCount ?? 0,
                status: easyshipRatesEvidence.ratesSmoke?.status ?? 0,
              }
            : null,
        },
        stripe: {
          mode: stripeTestEvidence?.mode ?? "unknown",
          evidence: stripeTestEvidence
            ? {
                checkedAt: stripeTestEvidence.checkedAt,
                ok: stripeTestEvidenceReady,
                cliSessionId: stripeTestEvidence.checkoutSessionSmoke?.sessionId ?? null,
                appSessionId: stripeTestEvidence.appRestrictedKeyCheckoutSmoke?.sessionId ?? null,
              }
            : null,
        },
        sfc: {
          mode: sfcReadiness.mode,
          code: sfcReadiness.code,
          smokePlanCode: sfcSmokePlan.code,
          actions: sfcSmokePlan.requests.map((request) => request.action),
          evidence: sfcSmokeEvidence
            ? {
                checkedAt: sfcSmokeEvidence.checkedAt,
                ok: sfcSmokeEvidenceReady,
                visibleSkus: sfcSmokeEvidence.productVisibility?.visibleSkus ?? 0,
                checkedSkus: sfcSmokeEvidence.productVisibility?.checkedSkus ?? 0,
              }
            : null,
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
