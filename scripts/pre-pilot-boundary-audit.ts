import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

type AuditCheck = {
  name: string;
  ok: boolean;
  blocking: boolean;
  detail: string;
};

type SfcEvidence = {
  provider?: string;
  mode?: string;
  mutationBoundary?: {
    sfcEnableMutations?: boolean;
    externalActions?: string;
    mutatingActions?: string[];
  };
  readOnlyApiSmoke?: {
    ok?: boolean;
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

type EasyshipEvidence = {
  provider?: string;
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
    status?: number;
    rateCount?: number;
    rawResponseStored?: boolean;
    credentialEchoes?: number;
  };
};

type StripeEvidence = {
  provider?: string;
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
    livemode?: boolean;
    paymentStatus?: string;
    paymentMethodTypesSentByApp?: boolean;
    rawCheckoutUrlStored?: boolean;
  };
  appRestrictedKeyCheckoutSmoke?: {
    ok?: boolean;
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

type VercelPreviewEvidence = {
  provider?: string;
  project?: {
    name?: string;
  };
  deployment?: {
    target?: string;
    readyState?: string;
    productionAliasAttached?: boolean;
  };
  deploymentProtection?: {
    directAnonymousStatus?: number;
    authenticatedSmokeMethod?: string;
    bypassSecretStoredInRepo?: boolean;
  };
  routes?: Array<{
    path?: string;
    status?: number;
  }>;
  health?: {
    ok?: boolean;
    blockedPmSupabase?: boolean;
    liveFlagsOff?: boolean;
    publicSupabaseConfigured?: boolean;
    serviceRoleSupabaseConfigured?: boolean;
  };
  contentSmoke?: Record<string, boolean>;
  runtimeLogs?: {
    errorEntriesPrinted?: number;
  };
  mutationBoundary?: Record<string, boolean>;
};

type VercelMainGitDeployEvidence = {
  provider?: string;
  project?: {
    name?: string;
    repository?: string;
  };
  deployment?: {
    target?: string;
    readyState?: string;
    branch?: string;
    frameworkPreset?: string;
    rootDirectory?: string;
    customProductionDomainAttached?: boolean;
  };
  gitIntegration?: {
    confirmed?: boolean;
    productionBranch?: string;
    rootDirectory?: string;
  };
  routes?: Array<{
    path?: string;
    status?: number;
  }>;
  health?: {
    ok?: boolean;
    blockedPmSupabase?: boolean;
    liveFlagsOff?: boolean;
    serviceRoleSupabaseConfigured?: boolean;
  };
  mutationBoundary?: {
    externalActions?: string;
    liveSupabaseMutation?: boolean;
    providerMutation?: boolean;
    stripeLiveAction?: boolean;
    labelExportTrackingAction?: boolean;
    customDomainAlias?: boolean;
  };
};

type PmProductionAggregateBaselineEvidence = {
  provider?: string;
  checkedAt?: string;
  scope?: {
    ownerApproved?: boolean;
    mode?: string;
    aggregateOnly?: boolean;
    rawRowsPrinted?: boolean;
    sensitiveValuesPrinted?: boolean;
    rawPiiStored?: boolean;
    serviceKeysPrinted?: boolean;
  };
  phase2Safety?: {
    liveMutationFlagsDisabled?: boolean;
    stripeCheckoutFlagConsistent?: boolean;
    fulfillmentSyncEnabled?: boolean;
  };
  pmBackersByInviteStatus?: Record<string, number>;
  pmPledgesByStatus?: Record<string, number>;
  pmPledgesByFulfillmentSyncStatus?: Record<string, number>;
  tableCounts?: Record<string, number>;
  fulfillmentIntakeLinks?: {
    pmPledgesWithFulfillmentOrderId?: number;
    fulfillmentBackers?: number;
    fulfillmentOrders?: number;
    fulfillmentOrderLines?: number;
  };
  boundary?: {
    pmPhase1Ready?: boolean;
    pmFulfillmentSyncDisabled?: boolean;
    fulfillmentOperationalRowsZero?: boolean;
    externalActions?: string;
  };
};

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function text(path: string) {
  return readFileSync(path, "utf8");
}

const stripe = loadJson<StripeEvidence>("docs/evidence/STRIPE_CLI_CHECKOUT_2026-05-14.json");
const easyship = loadJson<EasyshipEvidence>("docs/evidence/EASYSHIP_SANDBOX_RATES_2026-05-14.json");
const sfc = loadJson<SfcEvidence>("docs/evidence/SFC_READ_ONLY_SMOKE_2026-05-14.json");
const vercelPreview = loadJson<VercelPreviewEvidence>("docs/evidence/VERCEL_PROTECTED_PREVIEW_SMOKE_2026-05-15.json");
const vercelMainGitDeploy = loadJson<VercelMainGitDeployEvidence>("docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json");
const pmBaseline = loadJson<PmProductionAggregateBaselineEvidence>(
  "docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json",
);
const checklist = text("docs/PROJECT_CHECKLIST.md");
const envExample = text(".env.example");
const stagingPilot = text("docs/runbooks/STAGING_PILOT.md");

const stripeReady = Boolean(
  stripe?.provider === "stripe" &&
    stripe.mode === "test" &&
    stripe.webhookSecret?.configuredInIgnoredLocalEnv &&
    stripe.webhookSecret.rawValueStoredInRepo === false &&
    stripe.publishableKey?.prefix === "pk_test_" &&
    stripe.publishableKey.rawValueStoredInRepo === false &&
    stripe.restrictedKey?.prefix === "rk_test_" &&
    stripe.restrictedKey.rawValueStoredInRepo === false &&
    stripe.checkoutSessionSmoke?.ok &&
    stripe.checkoutSessionSmoke.livemode === false &&
    stripe.checkoutSessionSmoke.paymentStatus === "unpaid" &&
    stripe.checkoutSessionSmoke.paymentMethodTypesSentByApp === false &&
    stripe.checkoutSessionSmoke.rawCheckoutUrlStored === false &&
    stripe.appRestrictedKeyCheckoutSmoke?.ok &&
    stripe.appRestrictedKeyCheckoutSmoke.livemode === false &&
    stripe.appRestrictedKeyCheckoutSmoke.readinessCodeWithCheckoutEnabled === "stripe_checkout_ready" &&
    stripe.appRestrictedKeyCheckoutSmoke.persistedCheckoutFlag === false &&
    stripe.appRestrictedKeyCheckoutSmoke.rawCheckoutUrlStored === false &&
    stripe.mutationBoundary?.fulfillmentEnableStripeCheckout === false &&
    stripe.mutationBoundary.externalActions === "stripe_test_checkout_session_create_only" &&
    stripe.mutationBoundary.chargesCaptured === 0,
);

const easyshipReady = Boolean(
  easyship?.provider === "easyship" &&
    easyship.mode === "sandbox" &&
    easyship.apiVersion === "2024-09" &&
    easyship.ratesSmoke?.ok &&
    easyship.ratesSmoke.status === 200 &&
    typeof easyship.ratesSmoke.rateCount === "number" &&
    easyship.ratesSmoke.rateCount > 0 &&
    easyship.ratesSmoke.rawResponseStored === false &&
    easyship.ratesSmoke.credentialEchoes === 0 &&
    easyship.mutationBoundary?.easyshipEnableRates === true &&
    easyship.mutationBoundary.easyshipEnableShipments === false &&
    easyship.mutationBoundary.easyshipEnableTracking === false &&
    easyship.mutationBoundary.fulfillmentEnablePartnerApiPush === false &&
    easyship.mutationBoundary.externalActions === "sandbox_rates_only",
);

const sfcReady = Boolean(
  sfc?.provider === "sendfromchina" &&
    sfc.mode === "read_only" &&
    sfc.readOnlyApiSmoke?.ok &&
    sfc.readOnlyApiSmoke.soapFaults === 0 &&
    sfc.readOnlyApiSmoke.wsdlDocumentResponses === 0 &&
    sfc.readOnlyApiSmoke.credentialEchoes === 0 &&
    sfc.readOnlyApiSmoke.rawSoapStored === false &&
    sfc.productVisibility?.ok &&
    sfc.productVisibility.checkedSkus === sfc.productVisibility.visibleSkus &&
    sfc.productVisibility.missingSkus === 0 &&
    sfc.productVisibility.soapFaults === 0 &&
    sfc.productVisibility.wsdlDocumentResponses === 0 &&
    sfc.productVisibility.credentialEchoes === 0 &&
    sfc.productVisibility.rawSoapStored === false &&
    sfc.mutationBoundary?.sfcEnableMutations === false &&
    sfc.mutationBoundary.externalActions === "read_only_provider_api_only",
);

const vercelPreviewReady = Boolean(
  vercelPreview?.provider === "vercel" &&
    vercelPreview.project?.name === "odun-fulfillment-v1" &&
    vercelPreview.deployment?.target === "preview" &&
    vercelPreview.deployment.readyState === "READY" &&
    vercelPreview.deployment.productionAliasAttached === false &&
    vercelPreview.deploymentProtection?.directAnonymousStatus === 401 &&
    vercelPreview.deploymentProtection.authenticatedSmokeMethod === "vercel curl" &&
    vercelPreview.deploymentProtection.bypassSecretStoredInRepo === false &&
    ["/api/health", "/", "/shipping", "/quotes", "/payments", "/handoffs", "/reports"].every((path) =>
      vercelPreview.routes?.some((route) => route.path === path && route.status === 200),
    ) &&
    vercelPreview.health?.ok === true &&
    vercelPreview.health.blockedPmSupabase === false &&
    vercelPreview.health.liveFlagsOff === true &&
    vercelPreview.health.publicSupabaseConfigured === true &&
    vercelPreview.health.serviceRoleSupabaseConfigured === false &&
    Object.values(vercelPreview.contentSmoke ?? {}).length > 0 &&
    Object.values(vercelPreview.contentSmoke ?? {}).every(Boolean) &&
    vercelPreview.runtimeLogs?.errorEntriesPrinted === 0 &&
    Object.values(vercelPreview.mutationBoundary ?? {}).length > 0 &&
    Object.values(vercelPreview.mutationBoundary ?? {}).every((value) => value === false),
);

const vercelMainGitDeployReady = Boolean(
  vercelMainGitDeploy?.provider === "vercel" &&
    vercelMainGitDeploy.project?.name === "calinfi-fulfillment-5idm" &&
    vercelMainGitDeploy.project?.repository === "github.com/calinfi-fulfillment/calinfi-fulfillment" &&
    vercelMainGitDeploy.deployment?.target === "production" &&
    vercelMainGitDeploy.deployment?.readyState === "READY" &&
    vercelMainGitDeploy.deployment?.branch === "main" &&
    vercelMainGitDeploy.deployment?.frameworkPreset === "Next.js" &&
    vercelMainGitDeploy.deployment?.rootDirectory === "repository root" &&
    vercelMainGitDeploy.deployment?.customProductionDomainAttached === false &&
    vercelMainGitDeploy.gitIntegration?.confirmed === true &&
    vercelMainGitDeploy.gitIntegration?.productionBranch === "main" &&
    vercelMainGitDeploy.gitIntegration?.rootDirectory === "repository root" &&
    ["/api/health", "/", "/shipping", "/quotes", "/payments", "/handoffs", "/reports"].every((path) =>
      vercelMainGitDeploy.routes?.some((route) => route.path === path && route.status === 200),
    ) &&
    vercelMainGitDeploy.health?.ok === true &&
    vercelMainGitDeploy.health?.blockedPmSupabase === false &&
    vercelMainGitDeploy.health?.liveFlagsOff === true &&
    vercelMainGitDeploy.health?.serviceRoleSupabaseConfigured === false &&
    vercelMainGitDeploy.mutationBoundary?.externalActions === "public_route_smoke_only" &&
    vercelMainGitDeploy.mutationBoundary?.liveSupabaseMutation === false &&
    vercelMainGitDeploy.mutationBoundary?.providerMutation === false &&
    vercelMainGitDeploy.mutationBoundary?.stripeLiveAction === false &&
    vercelMainGitDeploy.mutationBoundary?.labelExportTrackingAction === false &&
    vercelMainGitDeploy.mutationBoundary?.customDomainAlias === false,
);

const pmBaselineReady = Boolean(
  pmBaseline?.provider === "calinfi-pledge-manager" &&
    pmBaseline.scope?.ownerApproved === true &&
    pmBaseline.scope.mode === "production_read_only_aggregate" &&
    pmBaseline.scope.aggregateOnly === true &&
    pmBaseline.scope.rawRowsPrinted === false &&
    pmBaseline.scope.sensitiveValuesPrinted === false &&
    pmBaseline.scope.rawPiiStored === false &&
    pmBaseline.scope.serviceKeysPrinted === false &&
    pmBaseline.phase2Safety?.liveMutationFlagsDisabled === true &&
    pmBaseline.phase2Safety?.stripeCheckoutFlagConsistent === true &&
    pmBaseline.phase2Safety?.fulfillmentSyncEnabled === false &&
    pmBaseline.tableCounts?.pm_backers ===
      Object.values(pmBaseline.pmBackersByInviteStatus ?? {}).reduce((sum, count) => sum + count, 0) &&
    pmBaseline.tableCounts?.pm_pledges ===
      Object.values(pmBaseline.pmPledgesByStatus ?? {}).reduce((sum, count) => sum + count, 0) &&
    pmBaseline.fulfillmentIntakeLinks?.pmPledgesWithFulfillmentOrderId === 0 &&
    pmBaseline.fulfillmentIntakeLinks?.fulfillmentBackers === 0 &&
    pmBaseline.fulfillmentIntakeLinks?.fulfillmentOrders === 0 &&
    pmBaseline.fulfillmentIntakeLinks?.fulfillmentOrderLines === 0 &&
    pmBaseline.boundary?.pmPhase1Ready === true &&
    pmBaseline.boundary?.pmFulfillmentSyncDisabled === true &&
    pmBaseline.boundary?.fulfillmentOperationalRowsZero === true &&
    pmBaseline.boundary?.externalActions === "pm_production_read_only_aggregate_only",
);

const checks: AuditCheck[] = [
  {
    name: "pm-supabase-blocklist",
    ok: checklist.includes("test:pm-supabase-guard") && envExample.includes("PM_SUPABASE_BLOCKED_PROJECT_REF=cjygwbfjekhhvwlyujyj"),
    blocking: true,
    detail: "Fulfillment PM Supabase blocklist is documented and covered by regression.",
  },
  {
    name: "stripe-test-evidence",
    ok: stripeReady,
    blocking: true,
    detail: "Stripe evidence must be test-mode only, no-charge, redacted, and Checkout-disabled in persisted env.",
  },
  {
    name: "easyship-sandbox-rates-evidence",
    ok: easyshipReady,
    blocking: true,
    detail: "Easyship evidence must be sandbox rates-only with shipment, label, export, and tracking disabled.",
  },
  {
    name: "sfc-read-only-evidence",
    ok: sfcReady,
    blocking: true,
    detail: "SFC evidence must be read-only, mutation-disabled, and free of SOAP faults, WSDL responses, credential echo, and raw SOAP storage.",
  },
  {
    name: "staging-supabase-synthetic-evidence",
    ok: stagingPilot.includes("non-PM Supabase project ref `mgdsvapgltzwhsioccqd`") && stagingPilot.includes("Synthetic pilot fixture was imported"),
    blocking: true,
    detail: "Staging Supabase must be the non-PM project and contain only synthetic pilot data for this audit scope.",
  },
  {
    name: "protected-preview-final-smoke",
    ok: vercelPreviewReady,
    blocking: true,
    detail: vercelPreviewReady
      ? "Protected Vercel preview smoke passed for `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, and `/reports`."
      : "Blocked until the pushed branch is redeployed to protected Vercel preview and `/api/health`, `/`, `/shipping`, `/quotes`, `/payments`, `/handoffs`, `/reports` are smoked.",
  },
  {
    name: "pm-production-aggregate-baseline",
    ok: pmBaselineReady,
    blocking: true,
    detail: pmBaselineReady
      ? "PM production aggregate-only baseline is present; no raw PII rows or sensitive values were printed/stored."
      : "Blocked until owner-approved PM production aggregate-only baseline is taken; no raw PII rows.",
  },
  {
    name: "sfc-certificate-review",
    ok: false,
    blocking: true,
    detail: "Blocked until SFC credential rotation or explicit certificate-source review is confirmed.",
  },
  {
    name: "vercel-git-integration",
    ok: vercelMainGitDeployReady,
    blocking: false,
    detail: vercelMainGitDeployReady
      ? "Git-connected Vercel main deployment is confirmed on the new account; no custom production domain or live mutation flag is enabled."
      : "Automatic PR previews remain a pre-production operations blocker; manual/local staging can continue.",
  },
];

const failedBlocking = checks.filter((check) => check.blocking && !check.ok);
const failedCodeEvidence = checks.filter((check) => check.blocking && !check.ok && !check.name.match(/protected-preview|pm-production|sfc-certificate/));
const okForCodeBoundary = failedCodeEvidence.length === 0;
const okForPrePilot = failedBlocking.length === 0;
const medium = [
  ...(!checks.find((check) => check.name === "vercel-git-integration")?.ok
    ? ["Vercel Git integration evidence is missing or stale; manual/local staging remains the safe fallback path."]
    : []),
];

assert.equal(okForCodeBoundary, true, `Code/provider evidence blockers remain: ${failedCodeEvidence.map((check) => check.name).join(", ")}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "pre-pilot-boundary-audit",
      okForCodeBoundary,
      okForPrePilot,
      checks,
      blockingBeforePilot: failedBlocking.map((check) => check.name),
      critical: failedBlocking.map((check) => check.detail),
      high: [],
      medium,
      low: [],
      externalActions: "none",
    },
    null,
    2,
  ),
);
