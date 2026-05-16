import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPmIntakePlan } from "../src/lib/pm-intake/processor";
import {
  applyPmIntakePersistencePlanToSyntheticStore,
  buildPmIntakePersistencePlan,
  createEmptySyntheticPmIntakeStore,
  summarizePmIntakePersistencePlan,
  type PmIntakePersistenceProduct,
} from "../src/lib/pm-intake/persistence";
import { PmIntakePayloadSchema, type PmIntakePayload } from "../src/lib/pm-intake/schema";
import { signPmIntakePayload, verifyPmIntakeSignature } from "../src/lib/pm-intake/signature";
import { isPmIntakeSupabasePersistenceEnabled } from "../src/lib/pm-intake/supabase-persistence";
import {
  areLiveMutationFlagsDisabled,
  hasFulfillmentSupabaseServiceRoleConfig,
  isPledgeManagerSupabaseUrl,
  LIVE_MUTATION_FLAG_KEYS,
} from "../src/lib/safety";

const repoRoot = process.cwd();

const payload: PmIntakePayload = {
  addressStatus: "complete",
  backer: {
    backerNumber: "1001",
    displayName: "Synthetic Backer",
    email: "synthetic@example.test",
    pmBackerId: "22222222-2222-4222-8222-222222222222",
    sourceBackerKey: "pm:22222222-2222-4222-8222-222222222222",
  },
  lines: [
    {
      lineRole: "reward",
      quantity: 1,
      rewardCode: "RWD_SYN_SINGLE",
      sku: "CLF-SYN-ODUN",
      title: "Synthetic ODUN",
    },
    {
      isBuiltinMainBoxItem: true,
      lineRole: "builtin",
      quantity: 1,
      rewardCode: "RWD_SYN_SINGLE",
      sku: "CLF-ACC-ODN-WBL",
      title: "Water Boiler for ODUN",
    },
    {
      addOnId: "44444444-4444-4444-8444-444444444444",
      lineRole: "addon",
      quantity: 1,
      sku: "CLF-SYN-STAND",
      title: "Synthetic Stand",
      unitValueCents: 3900,
    },
    {
      lineRole: "prepaid",
      quantity: 1,
      sku: "CLF-SYN-PREPAID",
      title: "Synthetic Prepaid Bag",
    },
  ],
  orderSnapshot: { rewardCode: "RWD_SYN_SINGLE", source: "synthetic-readiness" },
  orderStatus: "selection_submitted",
  pledgeId: "11111111-1111-4111-8111-111111111111",
  recipientSnapshot: { countryCode: "US" },
};

const products: PmIntakePersistenceProduct[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    readinessStatus: "ready",
    sku: "CLF-SYN-ODUN",
    title: "Synthetic ODUN",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    isBuiltinMainBoxItem: true,
    readinessStatus: "ready",
    sku: "CLF-ACC-ODN-WBL",
    title: "Water Boiler for ODUN",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    readinessStatus: "ready",
    sku: "CLF-SYN-STAND",
    title: "Synthetic Stand",
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    readinessStatus: "ready",
    sku: "CLF-SYN-PREPAID",
    title: "Synthetic Prepaid Bag",
  },
];

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function parseEnvFile(path: string) {
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) return {};

  return Object.fromEntries(
    readFileSync(fullPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  ) as Record<string, string>;
}

const envExample = read(".env.example");
for (const key of [
  "PM_INTAKE_SHARED_SECRET=",
  "PM_SUPABASE_BLOCKED_PROJECT_REF=cjygwbfjekhhvwlyujyj",
  "FULFILLMENT_ENABLE_PM_INTAKE=false",
  "FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS=false",
]) {
  assert.equal(envExample.includes(key), true, `.env.example must include ${key}`);
}

const localEnv = parseEnvFile(".env.local");
const enabledMutationFlags = LIVE_MUTATION_FLAG_KEYS.filter((key) => localEnv[key] === "true");
const openModeFlags = ["FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS", "FULFILLMENT_ENABLE_PM_INTAKE"];
const localMode = enabledMutationFlags.length === 0
  ? "local-synthetic-only"
  : enabledMutationFlags.sort().join(",") === openModeFlags.sort().join(",")
    ? "local-staging-open"
    : "unsafe-live-mutation-flags";
assert.notEqual(localMode, "unsafe-live-mutation-flags", "Only PM intake and Fulfillment Supabase mutations may be enabled for open-mode intake.");
if (localMode === "local-synthetic-only") {
  assert.equal(areLiveMutationFlagsDisabled(localEnv), true);
} else {
  assert.equal(Boolean(localEnv.PM_INTAKE_SHARED_SECRET), true, "Open-mode intake requires a shared PM intake secret.");
  assert.equal(hasFulfillmentSupabaseServiceRoleConfig(localEnv), true, "Open-mode intake requires non-PM Fulfillment service-role config.");
}
assert.equal(
  isPledgeManagerSupabaseUrl(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv),
  false,
  "Fulfillment local env must not point at the live Pledge Manager Supabase ref.",
);

const routeSource = read("src/app/api/pm/intake/route.ts");
assert.equal(routeSource.includes("verifyPmIntakeSignature"), true);
assert.equal(routeSource.includes("invalid_signature"), true);
assert.equal(routeSource.includes("pm_intake_disabled"), true);
assert.equal(routeSource.includes("persistence_not_enabled"), true);
assert.equal(routeSource.includes("persistPmIntakePayloadWithSupabase"), true);

const rawBody = JSON.stringify(payload);
const signature = signPmIntakePayload(rawBody, "synthetic-secret");
assert.equal(verifyPmIntakeSignature(rawBody, signature, "synthetic-secret"), true);
assert.equal(verifyPmIntakeSignature(rawBody, signature, "wrong-secret"), false);

const parsed = PmIntakePayloadSchema.parse(payload);
const plan = buildPmIntakePlan(parsed, products);
assert.equal(plan.blocked, false);
assert.equal(plan.excludedBuiltinItems.length, 1);
assert.equal(plan.orderLines.find((line) => line.sku === "CLF-ACC-ODN-WBL")?.isPhysical, false);

const persistencePlan = buildPmIntakePersistencePlan(parsed, {
  now: "2026-05-16T00:00:00.000Z",
  products,
});
const summary = summarizePmIntakePersistencePlan(persistencePlan);
assert.equal(persistencePlan.blocked, false);
assert.deepEqual(summary.plannedTables, ["backers", "orders", "order_lines", "excluded_builtin_items"]);
assert.equal(summary.orderLineCount, 4);
assert.equal(summary.excludedBuiltinItemCount, 1);
assert.equal(JSON.stringify(summary).includes("synthetic@example.test"), false);
assert.equal(JSON.stringify(summary).includes("Synthetic Backer"), false);

const syntheticStore = applyPmIntakePersistencePlanToSyntheticStore(createEmptySyntheticPmIntakeStore(), persistencePlan);
assert.equal(syntheticStore.backers.length, 1);
assert.equal(syntheticStore.orders.length, 1);
assert.equal(syntheticStore.orderLines.length, 4);
assert.equal(syntheticStore.excludedBuiltinItems.length, 1);

const lockedPlan = buildPmIntakePersistencePlan(parsed, {
  existingOrder: {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    lockedAt: "2026-05-16T00:00:00.000Z",
    orderStatus: "locked_for_fulfillment",
    sourceOrderKey: `pm:${payload.pledgeId}`,
  },
  products,
});
assert.equal(lockedPlan.blocked, true);
assert.equal(lockedPlan.issues.some((issue) => issue.code === "order_locked_for_fulfillment"), true);

assert.equal(
  isPmIntakeSupabasePersistenceEnabled({
    FULFILLMENT_ENABLE_LIVE_SUPABASE_MUTATIONS: "true",
    FULFILLMENT_ENABLE_PM_INTAKE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://cjygwbfjekhhvwlyujyj.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  }),
  false,
  "PM Supabase ref must never be accepted for Fulfillment persistence.",
);

console.log(
  JSON.stringify(
    {
      checked: "fulfillment-pm-intake-manual-readiness",
      mode: localMode,
      noLiveData: true,
      ok: true,
      plannedTables: summary.plannedTables,
      routeGuards: ["hmac-signature", "intake-flag", "persistence-flag", "pm-supabase-blocklist"],
    },
    null,
    2,
  ),
);
