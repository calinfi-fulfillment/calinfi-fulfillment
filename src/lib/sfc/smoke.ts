import type { SafetyEnv } from "../safety";
import { createSfcReadiness } from "./config";
import {
  buildSfcGetShippingMethodPlan,
  buildSfcGetWarehousePlan,
  buildSfcRatePlan,
  buildSfcRatesEstimatePlan,
  buildSfcStockPlan,
} from "./request";

export type SfcReadOnlySmokePlanInput = {
  warehouseId?: number;
  stockSku?: string;
  country?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  state?: string;
  divisionId?: string;
  zipCode?: string;
  shippingMethodCode?: string;
};

export type SfcReadOnlySmokePlan = {
  ok: boolean;
  provider: "sendfromchina";
  mode: "read_only_plan";
  code: "sfc_read_only_plan_ready" | "sfc_read_only_env_not_ready" | "sfc_read_only_plan_blocked";
  readinessCode: ReturnType<typeof createSfcReadiness>["code"];
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
  requests: ReturnType<
    | typeof buildSfcGetWarehousePlan
    | typeof buildSfcGetShippingMethodPlan
    | typeof buildSfcRatePlan
    | typeof buildSfcRatesEstimatePlan
    | typeof buildSfcStockPlan
  >[];
  externalActions: "none";
};

function containsConfiguredSecret(planText: string, env: SafetyEnv) {
  const configuredValues = [env.SFC_CUSTOMER_ID, env.SFC_APP_TOKEN, env.SFC_APP_KEY]
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length >= 4);

  return configuredValues.some((value) => planText.includes(value));
}

export function createSfcReadOnlySmokePlan(
  input: SfcReadOnlySmokePlanInput = {},
  env: SafetyEnv = process.env,
): SfcReadOnlySmokePlan {
  const readiness = createSfcReadiness(env);
  const warehouseId = input.warehouseId ?? 1;
  const stockSku = input.stockSku ?? "CLF-ODN-CORE";
  const rateRequest = input.shippingMethodCode
    ? buildSfcRatePlan(
        {
          country: input.country ?? "HK",
          weightKg: input.weightKg ?? 1.2,
          lengthCm: input.lengthCm ?? 30,
          widthCm: input.widthCm ?? 20,
          heightCm: input.heightCm ?? 12,
          warehouseId,
          shippingMethodCode: input.shippingMethodCode,
          priceType: "1",
        },
        env,
      )
    : buildSfcRatesEstimatePlan(
        {
          country: input.country ?? "HK",
          state: input.state,
          weightKg: input.weightKg ?? 1.2,
          lengthCm: input.lengthCm ?? 30,
          widthCm: input.widthCm ?? 20,
          heightCm: input.heightCm ?? 12,
          priceType: "1",
          divisionId: input.divisionId,
          zipCode: input.zipCode,
        },
        env,
      );
  const requests = [
    buildSfcGetWarehousePlan(env),
    buildSfcGetShippingMethodPlan({ warehouseId }, env),
    buildSfcStockPlan({ sku: stockSku, warehouseId }, env),
    rateRequest,
  ];
  const onlyReadOnlyPlans = requests.every((request) => !request.mutation && request.externalActions === "none");
  const secretsRedacted = !containsConfiguredSecret(JSON.stringify(requests), env);
  const readyForOwnerRun = readiness.code === "sfc_read_only_ready";
  const ok = readyForOwnerRun && onlyReadOnlyPlans && secretsRedacted;

  return {
    ok,
    provider: "sendfromchina",
    mode: "read_only_plan",
    code: ok ? "sfc_read_only_plan_ready" : onlyReadOnlyPlans && secretsRedacted ? "sfc_read_only_env_not_ready" : "sfc_read_only_plan_blocked",
    readinessCode: readiness.code,
    checks: [
      ...readiness.checks,
      {
        name: "read-only-actions-only",
        ok: onlyReadOnlyPlans,
        detail: onlyReadOnlyPlans
          ? "Only getWarehouse, getShippingMethod, getStockBySKU, and read-only rate plans are prepared."
          : "A mutation plan was detected.",
      },
      {
        name: "credentials-redacted",
        ok: secretsRedacted,
        detail: secretsRedacted ? "SFC credentials are not present in generated request previews." : "Generated plans contain configured SFC credentials.",
      },
    ],
    requests,
    externalActions: "none",
  };
}
