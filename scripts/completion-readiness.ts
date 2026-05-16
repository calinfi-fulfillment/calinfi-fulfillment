import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

import { createEasyshipReadiness } from "../src/lib/easyship";
import { areLiveMutationFlagsDisabled, isPledgeManagerSupabaseUrl } from "../src/lib/safety";
import { createSfcReadOnlySmokePlan, createSfcReadiness } from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";
import {
  loadSfcCertificateReviewEvidence,
  sfcCertificateReviewApproved,
  sfcCertificateReviewRedacted,
} from "./sfc-certificate-review-evidence";

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
  "docs/evidence/VERCEL_PROTECTED_PREVIEW_SMOKE_2026-05-15.json",
  "docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json",
  "docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json",
  "docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json",
  "docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json",
  "docs/evidence/STAGING_INVENTORY_SCHEMA_2026-05-15.json",
  "docs/audits/2026-05-11_LOCAL_BOUNDARY_AUDIT.md",
  "docs/audits/2026-05-15_PRE_PILOT_BOUNDARY_AUDIT.md",
];

const requiredScripts = [
  "build",
  "lint",
  "typecheck",
  "check:easyship-sandbox-env",
  "check:sfc-read-only-env",
  "test",
  "test:no-secrets",
  "test:checklist",
  "test:pre-pilot-boundary-audit",
  "test:staging-pilot-run",
  "test:fulfillment-test-backer",
  "test:sfc-certificate-review",
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

type VercelProtectedPreviewEvidence = {
  provider?: string;
  checkedAt?: string;
  project?: {
    name?: string;
    id?: string;
  };
  deployment?: {
    id?: string;
    url?: string;
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
    sizeBytes?: number;
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
  mutationBoundary?: {
    productionDeploy?: boolean;
    productionDomainAlias?: boolean;
    liveSupabaseMutation?: boolean;
    providerMutation?: boolean;
    stripeLiveAction?: boolean;
    labelExportTrackingAction?: boolean;
  };
};

type VercelMainGitDeployEvidence = {
  provider?: string;
  checkedAt?: string;
  project?: {
    name?: string;
    repository?: string;
  };
  deployment?: {
    id?: string;
    url?: string;
    target?: string;
    readyState?: string;
    branch?: string;
    commit?: string;
    frameworkPreset?: string;
    rootDirectory?: string;
    customProductionDomainAttached?: boolean;
  };
  gitIntegration?: {
    confirmed?: boolean;
    source?: string;
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
    publicSupabaseConfigured?: boolean;
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

type StagingPilotRunEvidence = {
  provider?: string;
  checkedAt?: string;
  status?: string;
  scope?: {
    ownerApproved?: boolean;
    mode?: string;
    stagingProjectRef?: string;
    fixture?: string;
    allowlistedSourceOrderKeys?: string[];
    aggregateOnly?: boolean;
    rawRowsPrinted?: boolean;
    rawPiiStored?: boolean;
    sensitiveValuesPrinted?: boolean;
    serviceKeysPrinted?: boolean;
  };
  preconditions?: {
    nonPmSupabaseRef?: boolean;
    pmSupabaseBlockedProjectRef?: string;
    liveMutationFlagsDisabled?: boolean;
    stripeMode?: string;
    stripeCheckoutEnabled?: boolean;
    providerApiQuotesEnabled?: boolean;
    handoffExportsEnabled?: boolean;
    partnerApiPushEnabled?: boolean;
    sfcMutationsEnabled?: boolean;
    easyshipShipmentsEnabled?: boolean;
    easyshipTrackingEnabled?: boolean;
    pmProductionMutation?: boolean;
  };
  stagingAggregateVerification?: {
    orders?: number;
    backers?: number;
    orderLines?: number;
    excludedBuiltinItems?: number;
    acceptedQuotes?: number;
    acceptedPaymentEvents?: number;
    readyHandoffs?: number;
  };
  syntheticPilotRun?: {
    checkedBy?: string[];
    ordersCompleted?: number;
    exportedPreviewRows?: number;
    excludedBuiltinItems?: number;
    routeTypes?: string[];
    orders?: Array<{
      sourceOrderKey?: string;
      routeType?: string;
      shippingMode?: string;
      externalActions?: string;
    }>;
  };
  mutationBoundary?: {
    externalActions?: string;
    stagingDbMutationThisPass?: boolean;
    liveSupabaseMutation?: boolean;
    providerMutation?: boolean;
    stripeLiveAction?: boolean;
    paymentCapture?: boolean;
    labelExportTrackingAction?: boolean;
    sfcMutation?: boolean;
    easyshipShipmentOrTracking?: boolean;
    pmProductionMutation?: boolean;
    rawPiiAccess?: boolean;
  };
};

type StagingInventorySchemaEvidence = {
  provider?: string;
  checkedAt?: string;
  status?: string;
  scope?: {
    ownerApproved?: boolean;
    mode?: string;
    stagingProjectRef?: string;
    appliedMigrationId?: string;
    productionMigration?: boolean;
    pmProductionMutation?: boolean;
    rawRowsPrinted?: boolean;
    rawPiiStored?: boolean;
    serviceKeysPrinted?: boolean;
    connectionStringsStored?: boolean;
    secretsStored?: boolean;
  };
  migration?: {
    method?: string;
    supabaseCliVersion?: string;
    historyRecorded?: boolean;
    remoteHistoryNote?: string;
  };
  publicSurface?: {
    ok?: boolean;
    mode?: string;
    tables?: string[];
    views?: string[];
  };
  rlsClientDeny?: {
    ok?: boolean;
    tables?: Array<{
      table?: string;
      rlsEnabled?: boolean;
      denyPolicyCount?: number;
    }>;
  };
  mutationBoundary?: {
    externalActions?: string;
    stagingDbSchemaMutation?: boolean;
    stagingDbSeedImport?: boolean;
    productionDbMutation?: boolean;
    providerMutation?: boolean;
    stripeLiveAction?: boolean;
    labelExportTrackingAction?: boolean;
    pmProductionRead?: boolean;
    pmProductionMutation?: boolean;
    rawPiiAccess?: boolean;
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

function loadVercelProtectedPreviewEvidence(): VercelProtectedPreviewEvidence | null {
  const evidencePath = "docs/evidence/VERCEL_PROTECTED_PREVIEW_SMOKE_2026-05-15.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as VercelProtectedPreviewEvidence;
  } catch {
    return null;
  }
}

function loadVercelMainGitDeployEvidence(): VercelMainGitDeployEvidence | null {
  const evidencePath = "docs/evidence/VERCEL_MAIN_GIT_DEPLOY_SMOKE_2026-05-15.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as VercelMainGitDeployEvidence;
  } catch {
    return null;
  }
}

function loadPmProductionBaselineEvidence(): PmProductionAggregateBaselineEvidence | null {
  const evidencePath = "docs/evidence/PM_PRODUCTION_AGGREGATE_BASELINE_2026-05-15.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as PmProductionAggregateBaselineEvidence;
  } catch {
    return null;
  }
}

function loadStagingPilotRunEvidence(): StagingPilotRunEvidence | null {
  const evidencePath = "docs/evidence/STAGING_PILOT_ORDER_RUN_2026-05-15.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as StagingPilotRunEvidence;
  } catch {
    return null;
  }
}

function loadStagingInventorySchemaEvidence(): StagingInventorySchemaEvidence | null {
  const evidencePath = "docs/evidence/STAGING_INVENTORY_SCHEMA_2026-05-15.json";
  if (!existsSync(evidencePath)) return null;

  try {
    return JSON.parse(readFileSync(evidencePath, "utf8")) as StagingInventorySchemaEvidence;
  } catch {
    return null;
  }
}

function pmProductionBaselineReady(evidence: PmProductionAggregateBaselineEvidence | null) {
  if (!evidence) return false;

  return Boolean(
    evidence.provider === "calinfi-pledge-manager" &&
      evidence.scope?.ownerApproved === true &&
      evidence.scope.mode === "production_read_only_aggregate" &&
      evidence.scope.aggregateOnly === true &&
      evidence.scope.rawRowsPrinted === false &&
      evidence.scope.sensitiveValuesPrinted === false &&
      evidence.scope.rawPiiStored === false &&
      evidence.scope.serviceKeysPrinted === false &&
      evidence.phase2Safety?.liveMutationFlagsDisabled === true &&
      evidence.phase2Safety?.stripeCheckoutFlagConsistent === true &&
      evidence.phase2Safety?.fulfillmentSyncEnabled === false &&
      evidence.tableCounts?.pm_backers === Object.values(evidence.pmBackersByInviteStatus ?? {}).reduce((sum, count) => sum + count, 0) &&
      evidence.tableCounts?.pm_pledges === Object.values(evidence.pmPledgesByStatus ?? {}).reduce((sum, count) => sum + count, 0) &&
      evidence.fulfillmentIntakeLinks?.pmPledgesWithFulfillmentOrderId === 0 &&
      evidence.fulfillmentIntakeLinks?.fulfillmentBackers === 0 &&
      evidence.fulfillmentIntakeLinks?.fulfillmentOrders === 0 &&
      evidence.fulfillmentIntakeLinks?.fulfillmentOrderLines === 0 &&
      evidence.boundary?.pmPhase1Ready === true &&
      evidence.boundary?.pmFulfillmentSyncDisabled === true &&
      evidence.boundary?.fulfillmentOperationalRowsZero === true &&
      evidence.boundary?.externalActions === "pm_production_read_only_aggregate_only",
  );
}

function stagingPilotRunReady(evidence: StagingPilotRunEvidence | null) {
  if (!evidence) return false;

  const sourceOrderKeys = new Set(evidence.scope?.allowlistedSourceOrderKeys ?? []);
  const routeTypes = new Set(evidence.syntheticPilotRun?.routeTypes ?? []);
  const preconditions = evidence.preconditions;
  const aggregate = evidence.stagingAggregateVerification;
  const run = evidence.syntheticPilotRun;
  const boundary = evidence.mutationBoundary;
  const mutationBoundaryValues = Object.entries(boundary ?? {}).filter(([key]) => key !== "externalActions");

  return Boolean(
    evidence.provider === "odun-fulfillment-v1" &&
      evidence.status === "completed" &&
      evidence.scope?.ownerApproved === true &&
      evidence.scope.mode === "staging_synthetic_allowlisted_order_run" &&
      evidence.scope.stagingProjectRef === "mgdsvapgltzwhsioccqd" &&
      evidence.scope.fixture === "fixtures/synthetic-pilot-orders.json" &&
      evidence.scope.aggregateOnly === true &&
      evidence.scope.rawRowsPrinted === false &&
      evidence.scope.rawPiiStored === false &&
      evidence.scope.sensitiveValuesPrinted === false &&
      evidence.scope.serviceKeysPrinted === false &&
      sourceOrderKeys.size === 2 &&
      sourceOrderKeys.has("pm:pilot-synthetic-regional-001") &&
      sourceOrderKeys.has("pm:pilot-synthetic-ddp-001") &&
      preconditions?.nonPmSupabaseRef === true &&
      preconditions?.pmSupabaseBlockedProjectRef === "cjygwbfjekhhvwlyujyj" &&
      preconditions?.liveMutationFlagsDisabled === true &&
      preconditions?.stripeMode === "test" &&
      preconditions?.stripeCheckoutEnabled === false &&
      preconditions?.providerApiQuotesEnabled === false &&
      preconditions?.handoffExportsEnabled === false &&
      preconditions?.partnerApiPushEnabled === false &&
      preconditions?.sfcMutationsEnabled === false &&
      preconditions?.easyshipShipmentsEnabled === false &&
      preconditions?.easyshipTrackingEnabled === false &&
      preconditions?.pmProductionMutation === false &&
      aggregate?.orders === 2 &&
      aggregate?.backers === 2 &&
      aggregate?.orderLines === 3 &&
      aggregate?.excludedBuiltinItems === 1 &&
      aggregate?.acceptedQuotes === 2 &&
      aggregate?.acceptedPaymentEvents === 2 &&
      aggregate?.readyHandoffs === 2 &&
      run?.ordersCompleted === 2 &&
      run?.exportedPreviewRows === 2 &&
      run?.excludedBuiltinItems === 1 &&
      routeTypes.size === 2 &&
      routeTypes.has("REGIONAL_3PL") &&
      routeTypes.has("CHINA_HK_DIRECT_DDP") &&
      run?.orders?.length === 2 &&
      run?.orders.every((order) => order.externalActions === "none") &&
      boundary?.externalActions === "none" &&
      mutationBoundaryValues.length > 0 &&
      mutationBoundaryValues.every(([, value]) => value === false),
  );
}

function stagingInventorySchemaReady(evidence: StagingInventorySchemaEvidence | null) {
  if (!evidence) return false;

  const requiredInventoryTables = new Set(["inventory_locations", "inventory_batches", "inventory_reservations"]);
  const tables = new Set(evidence.publicSurface?.tables ?? []);
  const views = new Set(evidence.publicSurface?.views ?? []);
  const boundary = evidence.mutationBoundary;
  const mutationBoundaryValues = Object.entries(boundary ?? {}).filter(([key]) => key !== "externalActions");

  return Boolean(
    evidence.provider === "odun-fulfillment-v1" &&
      evidence.status === "completed" &&
      evidence.scope?.ownerApproved === true &&
      evidence.scope.mode === "staging_inventory_schema_only" &&
      evidence.scope.stagingProjectRef === "mgdsvapgltzwhsioccqd" &&
      evidence.scope.appliedMigrationId === "0003_inventory_module" &&
      evidence.scope.productionMigration === false &&
      evidence.scope.pmProductionMutation === false &&
      evidence.scope.rawRowsPrinted === false &&
      evidence.scope.rawPiiStored === false &&
      evidence.scope.serviceKeysPrinted === false &&
      evidence.scope.connectionStringsStored === false &&
      evidence.scope.secretsStored === false &&
      evidence.migration?.method === "supabase db query --linked --file" &&
      evidence.migration?.historyRecorded === true &&
      evidence.publicSurface?.ok === true &&
      evidence.publicSurface.mode === "read-only-limit-zero-requests" &&
      [...requiredInventoryTables].every((table) => tables.has(table)) &&
      views.has("fulfillment_stock_feed") &&
      evidence.rlsClientDeny?.ok === true &&
      evidence.rlsClientDeny.tables?.length === 3 &&
      evidence.rlsClientDeny.tables.every((table) => table.rlsEnabled === true && (table.denyPolicyCount ?? 0) >= 1) &&
      boundary?.externalActions === "none" &&
      boundary?.stagingDbSchemaMutation === true &&
      mutationBoundaryValues.length > 0 &&
      mutationBoundaryValues.filter(([key]) => key !== "stagingDbSchemaMutation").every(([, value]) => value === false),
  );
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

function vercelProtectedPreviewReady(evidence: VercelProtectedPreviewEvidence | null) {
  if (!evidence) return false;

  const requiredRoutes = new Set(["/api/health", "/", "/shipping", "/quotes", "/payments", "/handoffs", "/reports"]);
  const routeStatuses = new Map((evidence.routes ?? []).map((route) => [route.path, route.status]));
  const contentSmokeValues = Object.values(evidence.contentSmoke ?? {});
  const mutationBoundaryValues = Object.values(evidence.mutationBoundary ?? {});

  return Boolean(
    evidence.provider === "vercel" &&
      evidence.project?.name === "odun-fulfillment-v1" &&
      evidence.deployment?.target === "preview" &&
      evidence.deployment.readyState === "READY" &&
      evidence.deployment.productionAliasAttached === false &&
      evidence.deploymentProtection?.directAnonymousStatus === 401 &&
      evidence.deploymentProtection.authenticatedSmokeMethod === "vercel curl" &&
      evidence.deploymentProtection.bypassSecretStoredInRepo === false &&
      [...requiredRoutes].every((path) => routeStatuses.get(path) === 200) &&
      evidence.health?.ok === true &&
      evidence.health.blockedPmSupabase === false &&
      evidence.health.liveFlagsOff === true &&
      evidence.health.publicSupabaseConfigured === true &&
      evidence.health.serviceRoleSupabaseConfigured === false &&
      contentSmokeValues.length > 0 &&
      contentSmokeValues.every(Boolean) &&
      evidence.runtimeLogs?.errorEntriesPrinted === 0 &&
      mutationBoundaryValues.length > 0 &&
      mutationBoundaryValues.every((value) => value === false),
  );
}

function vercelMainGitDeployReady(evidence: VercelMainGitDeployEvidence | null) {
  if (!evidence) return false;

  const requiredRoutes = new Set(["/api/health", "/", "/shipping", "/quotes", "/payments", "/handoffs", "/reports"]);
  const routeStatuses = new Map((evidence.routes ?? []).map((route) => [route.path, route.status]));

  return Boolean(
    evidence.provider === "vercel" &&
      evidence.project?.name === "calinfi-fulfillment-5idm" &&
      evidence.project?.repository === "github.com/calinfi-fulfillment/calinfi-fulfillment" &&
      evidence.deployment?.target === "production" &&
      evidence.deployment?.readyState === "READY" &&
      evidence.deployment?.branch === "main" &&
      evidence.deployment?.frameworkPreset === "Next.js" &&
      evidence.deployment?.rootDirectory === "repository root" &&
      evidence.deployment?.customProductionDomainAttached === false &&
      evidence.gitIntegration?.confirmed === true &&
      evidence.gitIntegration?.productionBranch === "main" &&
      evidence.gitIntegration?.rootDirectory === "repository root" &&
      [...requiredRoutes].every((path) => routeStatuses.get(path) === 200) &&
      evidence.health?.ok === true &&
      evidence.health?.blockedPmSupabase === false &&
      evidence.health?.liveFlagsOff === true &&
      evidence.health?.serviceRoleSupabaseConfigured === false &&
      evidence.mutationBoundary?.externalActions === "public_route_smoke_only" &&
      evidence.mutationBoundary?.liveSupabaseMutation === false &&
      evidence.mutationBoundary?.providerMutation === false &&
      evidence.mutationBoundary?.stripeLiveAction === false &&
      evidence.mutationBoundary?.labelExportTrackingAction === false &&
      evidence.mutationBoundary?.customDomainAlias === false,
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
const sfcCertificateReviewEvidence = loadSfcCertificateReviewEvidence();
const sfcCertificateReviewEvidenceRedacted = sfcCertificateReviewRedacted(sfcCertificateReviewEvidence);
const vercelPreviewEvidence = loadVercelProtectedPreviewEvidence();
const vercelPreviewEvidenceReady = vercelProtectedPreviewReady(vercelPreviewEvidence);
const vercelMainGitDeployEvidence = loadVercelMainGitDeployEvidence();
const vercelMainGitDeployEvidenceReady = vercelMainGitDeployReady(vercelMainGitDeployEvidence);
const pmBaselineEvidence = loadPmProductionBaselineEvidence();
const pmBaselineReady = pmProductionBaselineReady(pmBaselineEvidence);
const stagingPilotEvidence = loadStagingPilotRunEvidence();
const stagingPilotEvidenceReady = stagingPilotRunReady(stagingPilotEvidence);
const stagingInventorySchemaEvidence = loadStagingInventorySchemaEvidence();
const stagingInventorySchemaEvidenceReady = stagingInventorySchemaReady(stagingInventorySchemaEvidence);
const liveMutationSafe = areLiveMutationFlagsDisabled(process.env);
const pmSupabaseSafe = !isPledgeManagerSupabaseUrl(envValue("NEXT_PUBLIC_SUPABASE_URL"), process.env);
const easyshipShipmentSafe = envValue("EASYSHIP_ENABLE_SHIPMENTS") !== "true";
const easyshipTrackingSafe = envValue("EASYSHIP_ENABLE_TRACKING") !== "true";
const sfcMutationSafe = envValue("SFC_ENABLE_MUTATIONS") !== "true";
const sfcCertificateReviewed = sfcCertificateReviewApproved(sfcCertificateReviewEvidence);
const prePilotAuditReady =
  pmBaselineReady &&
  vercelPreviewEvidenceReady &&
  vercelMainGitDeployEvidenceReady &&
  stripeTestEvidenceReady &&
  easyshipRatesEvidenceReady &&
  sfcSmokeEvidenceReady &&
  sfcCertificateReviewed &&
  pmSupabaseSafe &&
  liveMutationSafe &&
  sfcMutationSafe;
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
    name: "vercel-protected-preview-evidence",
    ok: vercelPreviewEvidenceReady,
    detail: vercelPreviewEvidenceReady
      ? `Protected Vercel preview smoke evidence present from ${vercelPreviewEvidence?.checkedAt}; deployment ${vercelPreviewEvidence?.deployment?.id} passed 7 routes.`
      : "Protected Vercel preview smoke evidence is missing or incomplete.",
  },
  {
    name: "vercel-main-git-deploy-evidence",
    ok: vercelMainGitDeployEvidenceReady,
    detail: vercelMainGitDeployEvidenceReady
      ? `Git-connected Vercel main deployment present from ${vercelMainGitDeployEvidence?.checkedAt}; deployment ${vercelMainGitDeployEvidence?.deployment?.id} passed 7 public routes with live flags off.`
      : "Git-connected Vercel main deployment evidence is missing or incomplete.",
  },
  {
    name: "pm-production-aggregate-baseline",
    ok: pmBaselineReady,
    detail: pmBaselineReady
      ? `PM production aggregate-only baseline present from ${pmBaselineEvidence?.checkedAt}; raw PII and sensitive values were not printed/stored.`
      : "PM production aggregate-only baseline evidence is missing or incomplete.",
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
  {
    name: "sfc-certificate-review-evidence-redacted",
    ok: sfcCertificateReviewEvidenceRedacted,
    detail: sfcCertificateReviewEvidenceRedacted
      ? `SFC certificate review packet is redacted and currently ${sfcCertificateReviewEvidence?.status}.`
      : "SFC certificate review packet is missing or not redacted.",
  },
  {
    name: "pre-pilot-boundary-audit-formal-pass",
    ok: prePilotAuditReady,
    detail: prePilotAuditReady
      ? "Formal pre-pilot boundary evidence is complete."
      : "Formal pre-pilot boundary evidence is not complete.",
  },
  {
    name: "staging-pilot-order-run-evidence",
    ok: stagingPilotEvidenceReady,
    detail: stagingPilotEvidenceReady
      ? `Allowlisted staging pilot run evidence is complete from ${stagingPilotEvidence?.checkedAt}; 2 synthetic orders reached handoff preview with no external actions.`
      : "Allowlisted staging pilot run evidence is missing or incomplete.",
  },
  {
    name: "staging-inventory-schema-evidence",
    ok: stagingInventorySchemaEvidenceReady,
    detail: stagingInventorySchemaEvidenceReady
      ? `Staging inventory schema evidence is complete from ${stagingInventorySchemaEvidence?.checkedAt}; public inventory tables and stock feed view passed zero-row checks.`
      : "Staging inventory schema evidence is missing or incomplete.",
  },
];

const launchBlockers = [
  ...(gitStatus ? ["Local changes still need an intentional commit."] : []),
  ...(!gitUpstream
    ? ["Current branch has no upstream remote tracking branch."]
    : gitAheadCount > 0
      ? [`Current branch ${gitBranch || "(unknown)"} is ${gitAheadCount} commit(s) ahead of ${gitUpstream}; push is still required.`]
      : []),
  ...(!vercelMainGitDeployEvidenceReady ? ["Vercel Git integration/account alignment is not confirmed."] : []),
  ...(!vercelPreviewEvidenceReady ? ["Protected preview smoke must be rerun after the latest changes are deployed."] : []),
  ...(!pmBaselineReady ? ["PM production read-only aggregate baseline still requires approved scope."] : []),
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
  ...(!prePilotAuditReady ? ["Formal pre-pilot Sınır Bekçisi audit is still pending."] : []),
  ...(!stagingPilotEvidenceReady
    ? ["1-2 allowlisted staging pilot order run is still pending explicit pilot-run approval and execution."]
    : []),
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
        vercelPreview: {
          evidence: vercelPreviewEvidence
            ? {
                checkedAt: vercelPreviewEvidence.checkedAt,
                ok: vercelPreviewEvidenceReady,
                deploymentId: vercelPreviewEvidence.deployment?.id ?? null,
                url: vercelPreviewEvidence.deployment?.url ?? null,
              }
            : null,
        },
        vercelMainGitDeploy: {
          evidence: vercelMainGitDeployEvidence
            ? {
                checkedAt: vercelMainGitDeployEvidence.checkedAt,
                ok: vercelMainGitDeployEvidenceReady,
                deploymentId: vercelMainGitDeployEvidence.deployment?.id ?? null,
                url: vercelMainGitDeployEvidence.deployment?.url ?? null,
                gitIntegrationConfirmed: vercelMainGitDeployEvidence.gitIntegration?.confirmed ?? false,
              }
            : null,
        },
        pmProductionBaseline: {
          evidence: pmBaselineEvidence
            ? {
                checkedAt: pmBaselineEvidence.checkedAt,
                ok: pmBaselineReady,
                pmBackers: pmBaselineEvidence.tableCounts?.pm_backers ?? 0,
                pmPledges: pmBaselineEvidence.tableCounts?.pm_pledges ?? 0,
                fulfillmentOrders: pmBaselineEvidence.fulfillmentIntakeLinks?.fulfillmentOrders ?? 0,
              }
            : null,
        },
        stagingPilot: {
          evidence: stagingPilotEvidence
            ? {
                checkedAt: stagingPilotEvidence.checkedAt,
                ok: stagingPilotEvidenceReady,
                orders: stagingPilotEvidence.syntheticPilotRun?.ordersCompleted ?? 0,
                exportedPreviewRows: stagingPilotEvidence.syntheticPilotRun?.exportedPreviewRows ?? 0,
                stagingProjectRef: stagingPilotEvidence.scope?.stagingProjectRef ?? null,
              }
            : null,
        },
        stagingInventorySchema: {
          evidence: stagingInventorySchemaEvidence
            ? {
                checkedAt: stagingInventorySchemaEvidence.checkedAt,
                ok: stagingInventorySchemaEvidenceReady,
                migration: stagingInventorySchemaEvidence.scope?.appliedMigrationId ?? null,
                stagingProjectRef: stagingInventorySchemaEvidence.scope?.stagingProjectRef ?? null,
                tables: stagingInventorySchemaEvidence.publicSurface?.tables?.length ?? 0,
                views: stagingInventorySchemaEvidence.publicSurface?.views?.length ?? 0,
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
          certificateReview: sfcCertificateReviewEvidence
            ? {
                checkedAt: sfcCertificateReviewEvidence.checkedAt,
                status: sfcCertificateReviewEvidence.status,
                redacted: sfcCertificateReviewEvidenceRedacted,
                approvedForPilotGate: sfcCertificateReviewed,
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
