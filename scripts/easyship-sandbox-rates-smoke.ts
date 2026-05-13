import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildEasyshipRatesRequestPlan, createEasyshipReadiness, easyshipApiToken } from "../src/lib/easyship";
import { createOrderQuoteFingerprint } from "../src/lib/route-quote";

function parseDotEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  const rawValue = trimmed.slice(equalsIndex + 1).trim();
  const value =
    (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ? rawValue.slice(1, -1)
      : rawValue;

  return key ? { key, value } : null;
}

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  const loaded: Record<string, string> = {};

  if (!existsSync(envPath)) return loaded;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const parsed = parseDotEnvLine(line);
    if (!parsed) continue;
    if (parsed.key.startsWith("EASYSHIP_")) loaded[parsed.key] = parsed.value;
  }

  return loaded;
}

function redactToken(value: string, token: string) {
  return token ? value.replaceAll(token, "[redacted]") : value;
}

function easyshipSmokeHint(status: number) {
  if (status === 400) return "Review the synthetic rates payload against the current Easyship sandbox schema.";
  if (status === 401 || status === 403) {
    return "Verify the sandbox Bearer token has public.rate:read scope and belongs to the same 2024-09 Easyship API integration.";
  }
  if (status === 404) return "Verify the Easyship sandbox base URL and API version path.";
  if (status >= 500) return "Retry later or check Easyship sandbox API status; no shipment, label, export, or tracking action was attempted.";
  return "Review Easyship sandbox response details without exposing token values.";
}

async function main() {
  const localEnv = loadLocalEnv();
  const env = {
    ...process.env,
    ...localEnv,
    EASYSHIP_ENABLE_SHIPMENTS: "false",
    EASYSHIP_ENABLE_TRACKING: "false",
    FULFILLMENT_ENABLE_PARTNER_API_PUSH: "false",
  };
  const readiness = createEasyshipReadiness(env);

  assert.equal(readiness.mode, "sandbox", "EASYSHIP_MODE must be sandbox for this smoke.");
  assert.equal(readiness.ok, true, `Easyship sandbox readiness failed: ${readiness.code}`);

  const token = easyshipApiToken(env);
  assert.equal(token.length > 0, true, "EASYSHIP_API_TOKEN is required.");

  const sourceOrderKey = "pm:easyship-sandbox-smoke";
  const fingerprint = createOrderQuoteFingerprint({
    sourceOrderKey,
    countryCode: "US",
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1 }],
  });
  const quoteRequest = {
    orderId: "cdcdcdcd-cdcd-4cdc-8dcd-cdcdcdcdcdcd",
    currency: "USD",
    countryCode: "US",
    routeType: "REGIONAL_3PL" as const,
    shippingMode: "3PL_INTERNAL_LABEL" as const,
    lines: [{ sku: "CLF-ODN-CORE", quantity: 1, weightGrams: 1200 }],
    orderFingerprint: fingerprint,
    now: new Date("2026-05-12T00:00:00.000Z"),
  };
  const plan = buildEasyshipRatesRequestPlan(
    {
      quoteRequest,
      originAddress: {
        country_alpha2: "US",
        line_1: "Synthetic Warehouse",
        city: "Los Angeles",
        state: "CA",
        postal_code: "90001",
      },
      destinationAddress: {
        country_alpha2: "US",
        line_1: "Synthetic Destination",
        city: "Seattle",
        state: "WA",
        postal_code: "98101",
      },
      box: {
        length: 30,
        width: 20,
        height: 12,
        unit: "cm",
      },
      totalActualWeightKg: 1.2,
      incoterms: "DDU",
      calculateTaxAndDuties: false,
    },
    env,
  );

  const response = await fetch(plan.url, {
    method: plan.method,
    headers: {
      ...plan.headers,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(plan.body),
    signal: AbortSignal.timeout(15_000),
  });
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorSummary = {
      status: response.status,
      statusText: response.statusText,
      code: typeof responseBody === "object" && responseBody && "code" in responseBody ? String(responseBody.code) : "unknown",
      message:
        typeof responseBody === "object" && responseBody && "message" in responseBody
          ? redactToken(String(responseBody.message), token).slice(0, 240)
          : "Easyship returned a non-JSON or undocumented error.",
      hint: easyshipSmokeHint(response.status),
    };

    throw new Error(`Easyship sandbox rates smoke failed: ${JSON.stringify(errorSummary)}`);
  }

  const bodyText = JSON.stringify(responseBody);
  assert.equal(bodyText.includes(token), false, "Easyship response must not echo token.");

  const rateCount =
    typeof responseBody === "object" && responseBody && "rates" in responseBody && Array.isArray(responseBody.rates)
      ? responseBody.rates.length
      : typeof responseBody === "object" && responseBody && "courier_services" in responseBody && Array.isArray(responseBody.courier_services)
        ? responseBody.courier_services.length
        : 0;

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: "easyship-sandbox-rates-smoke",
        endpoint: plan.url,
        status: response.status,
        rateCount,
        token: "redacted",
        externalActions: "sandbox_rates_only",
      },
      null,
      2,
    ),
  );
}

main();
