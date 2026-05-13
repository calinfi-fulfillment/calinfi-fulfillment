import {
  assertSfcReadOnlyExecutionPlan,
  createSfcReadOnlySmokePlan,
  hydrateSfcRequestBodyForExecution,
  summarizeSfcReadOnlyResponse,
} from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

const plan = createSfcReadOnlySmokePlan({
  warehouseId: Number(process.env.SFC_SMOKE_WAREHOUSE_ID || 1),
  stockSku: process.env.SFC_SMOKE_STOCK_SKU || "CLF-ODN-CORE",
  country: process.env.SFC_SMOKE_COUNTRY || "HK",
  state: process.env.SFC_SMOKE_STATE || undefined,
  divisionId: process.env.SFC_SMOKE_DIVISION_ID || undefined,
  zipCode: process.env.SFC_SMOKE_ZIP_CODE || undefined,
  shippingMethodCode: process.env.SFC_SMOKE_SHIPPING_METHOD_CODE || undefined,
});

function printPlanBlocked() {
  console.log(
    JSON.stringify(
      {
        ok: false,
        checked: "sfc-read-only-api-smoke",
        provider: plan.provider,
        code: plan.code,
        readinessCode: plan.readinessCode,
        requestActions: plan.requests.map((request) => request.action),
        checks: plan.checks,
        externalActions: "none",
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (!plan.ok) {
    printPlanBlocked();
    process.exitCode = 1;
    return;
  }

  const results = [];

  for (const request of plan.requests) {
    assertSfcReadOnlyExecutionPlan(request);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: hydrateSfcRequestBodyForExecution(request),
        signal: AbortSignal.timeout(15_000),
      });
      const responseText = await response.text();
      results.push(summarizeSfcReadOnlyResponse(request, response, responseText));
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 180) : "Unknown SFC read-only smoke error.";

      results.push({
        action: request.action,
        status: 0,
        statusText: "request_failed",
        ok: false,
        contentType: "unknown",
        responseBytes: 0,
        responseSha256: "",
        hasSoapFault: false,
        containsCredentialEcho: false,
        error: message,
      });
    }
  }

  const ok = results.every((result) => result.ok);

  console.log(
    JSON.stringify(
      {
        ok,
        checked: "sfc-read-only-api-smoke",
        provider: plan.provider,
        requestActions: plan.requests.map((request) => request.action),
        results,
        externalActions: "read_only_provider_api_only",
      },
      null,
      2,
    ),
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

main();
