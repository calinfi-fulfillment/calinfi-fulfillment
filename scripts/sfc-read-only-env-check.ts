import { createSfcReadOnlySmokePlan, createSfcReadiness, sfcServiceUrl, sfcWsdlUrl } from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";

loadLocalEnvFile();

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function envValue(key: string) {
  return String(process.env[key] ?? "").trim();
}

function enabled(key: string) {
  return envValue(key) === "true";
}

function positiveInteger(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function safeUrlCheck() {
  try {
    const url = new URL(sfcWsdlUrl(process.env));
    const knownHost = url.hostname === "fulfill.sfcservice.com" || url.hostname === "fulfill.sendfromchina.com";
    const knownProtocol = url.protocol === "http:" || url.protocol === "https:";

    return {
      ok: knownProtocol && knownHost,
      detail: knownProtocol && knownHost ? `${url.hostname}${url.pathname}` : "WSDL URL must use the known SFC fulfillment host.",
    };
  } catch {
    return {
      ok: false,
      detail: "WSDL URL is not parseable.",
    };
  }
}

function safeServiceUrlCheck() {
  try {
    const url = new URL(sfcServiceUrl(process.env));
    const knownHost =
      url.hostname === "cff-api.suntekcorps.com" || url.hostname === "fulfill.sfcservice.com" || url.hostname === "fulfill.sendfromchina.com";
    const knownProtocol = url.protocol === "http:" || url.protocol === "https:";

    return {
      ok: knownProtocol && knownHost && !url.pathname.endsWith("/wsdl"),
      detail:
        knownProtocol && knownHost && !url.pathname.endsWith("/wsdl")
          ? `${url.hostname}${url.pathname}`
          : "SFC service URL must use the SOAP service endpoint, not the WSDL document URL.",
    };
  } catch {
    return {
      ok: false,
      detail: "SFC service URL is not parseable.",
    };
  }
}

const readiness = createSfcReadiness(process.env);
const smokePlan = createSfcReadOnlySmokePlan(
  {
    warehouseId: Number(envValue("SFC_SMOKE_WAREHOUSE_ID") || 1),
    stockSku: envValue("SFC_SMOKE_STOCK_SKU") || "CLF-ODN-CORE",
    country: envValue("SFC_SMOKE_COUNTRY") || "HK",
    state: envValue("SFC_SMOKE_STATE") || undefined,
    divisionId: envValue("SFC_SMOKE_DIVISION_ID") || undefined,
    zipCode: envValue("SFC_SMOKE_ZIP_CODE") || undefined,
    shippingMethodCode: envValue("SFC_SMOKE_SHIPPING_METHOD_CODE") || undefined,
  },
  process.env,
);
const wsdl = safeUrlCheck();
const serviceUrl = safeServiceUrlCheck();
const rateAction = smokePlan.requests.find((request) => request.action === "getRateByMode" || request.action === "getRates")?.action ?? "missing";
const credentialKeys = ["SFC_CUSTOMER_ID", "SFC_APP_TOKEN", "SFC_APP_KEY"] as const;

const checks: Check[] = [
  {
    name: "sfc-mode-read-only",
    ok: envValue("SFC_MODE") === "read_only",
    detail: envValue("SFC_MODE") === "read_only" ? "SFC_MODE is read_only." : `SFC_MODE is ${envValue("SFC_MODE") || "missing"}.`,
  },
  {
    name: "sfc-wsdl-known-host",
    ok: wsdl.ok,
    detail: wsdl.detail,
  },
  {
    name: "sfc-service-known-host",
    ok: serviceUrl.ok,
    detail: serviceUrl.detail,
  },
  {
    name: "sfc-credentials-present",
    ok: credentialKeys.every((key) => envValue(key).length > 0),
    detail: credentialKeys
      .map((key) => `${key}:${envValue(key).length > 0 ? `present:${envValue(key).length}` : "missing"}`)
      .join(", "),
  },
  {
    name: "sfc-read-only-flag-enabled",
    ok: enabled("SFC_ENABLE_READ_ONLY_API"),
    detail: enabled("SFC_ENABLE_READ_ONLY_API") ? "SFC_ENABLE_READ_ONLY_API is true." : "SFC_ENABLE_READ_ONLY_API is not true.",
  },
  {
    name: "sfc-mutations-disabled",
    ok: !enabled("SFC_ENABLE_MUTATIONS"),
    detail: enabled("SFC_ENABLE_MUTATIONS") ? "SFC_ENABLE_MUTATIONS must stay false." : "SFC_ENABLE_MUTATIONS is false or unset.",
  },
  {
    name: "sfc-warehouse-id",
    ok: positiveInteger(envValue("SFC_SMOKE_WAREHOUSE_ID") || "1"),
    detail: `warehouseId=${envValue("SFC_SMOKE_WAREHOUSE_ID") || "1"}`,
  },
  {
    name: "sfc-stock-sku",
    ok: envValue("SFC_SMOKE_STOCK_SKU").length > 0,
    detail: envValue("SFC_SMOKE_STOCK_SKU") ? "Stock SKU is configured." : "SFC_SMOKE_STOCK_SKU is missing.",
  },
  {
    name: "sfc-rate-plan",
    ok: rateAction !== "missing" && envValue("SFC_SMOKE_COUNTRY").length >= 2,
    detail: `rateAction=${rateAction}; country=${envValue("SFC_SMOKE_COUNTRY") || "missing"}`,
  },
  {
    name: "sfc-certificate-rotation-reviewed",
    ok: enabled("SFC_CERT_ROTATED_CONFIRMED"),
    detail: enabled("SFC_CERT_ROTATED_CONFIRMED")
      ? "SFC certificate rotation/review is confirmed."
      : "Set SFC_CERT_ROTATED_CONFIRMED=true only after rotating or explicitly approving the certificate source.",
  },
  {
    name: "sfc-plan-safe",
    ok: smokePlan.requests.every((request) => request.mutation === false && request.externalActions === "none"),
    detail: smokePlan.requests.map((request) => request.action).join(", "),
  },
];

const ok = checks.every((check) => check.ok) && readiness.code === "sfc_read_only_ready" && smokePlan.code === "sfc_read_only_plan_ready";

console.log(
  JSON.stringify(
    {
      ok,
      checked: "sfc-read-only-env",
      provider: "sendfromchina",
      readinessCode: readiness.code,
      smokePlanCode: smokePlan.code,
      safeToRunReadOnlyApi: ok,
      requests: smokePlan.requests.map((request) => ({
        action: request.action,
        mutation: request.mutation,
        externalActions: request.externalActions,
      })),
      checks,
      externalActions: "none",
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
