import { assertSfcReadOnlyExecutionPlan, buildSfcStockPlan, createSfcReadiness, hydrateSfcRequestBodyForExecution, summarizeSfcReadOnlyResponse } from "../src/lib/sfc";
import { loadLocalEnvFile } from "./load-local-env";
import { loadSfcCertificateReviewEvidence, sfcCertificateReviewApproved } from "./sfc-certificate-review-evidence";

loadLocalEnvFile();

type StockVisibilityResult = {
  sku: string;
  visible: boolean;
  action: "getStockBySKU";
  status: number;
  statusText: string;
  ok: boolean;
  ask: string;
  message: string;
  responseSku: string;
  stock: string;
  physicalStock: string;
  virtualStock: string;
  stockOnHold: string;
  putawayQuantity: string;
  stockProblem: string;
  warehouseId: string;
  responseKind: string;
  responseBytes: number;
  responseSha256: string;
  hasSoapFault: boolean;
  hasWsdlDocument: boolean;
  containsCredentialEcho: boolean;
  error?: string;
};

function envValue(key: string) {
  return String(process.env[key] ?? "").trim();
}

function configuredSkus() {
  const bulk = envValue("SFC_SMOKE_STOCK_SKUS");
  const single = envValue("SFC_SMOKE_STOCK_SKU") || "CLF-ODN-CORE";
  return (bulk || single)
    .split(/[,\s]+/)
    .map((sku) => sku.trim())
    .filter(Boolean);
}

function extractTag(xml: string, tag: string) {
  const match = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>(.*?)</(?:\\w+:)?${tag}>`, "is").exec(xml);
  if (!match) return "";

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function assertSafeRuntime() {
  const readiness = createSfcReadiness(process.env);
  const certificateReviewEvidence = loadSfcCertificateReviewEvidence();
  const certificateReviewed = envValue("SFC_CERT_ROTATED_CONFIRMED") === "true" || sfcCertificateReviewApproved(certificateReviewEvidence);

  if (!readiness.ok || readiness.code !== "sfc_read_only_ready" || !certificateReviewed) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          checked: "sfc-product-visibility",
          provider: "sendfromchina",
          readinessCode: readiness.code,
          checks: [
            ...readiness.checks,
            {
              name: "sfc-certificate-rotation-reviewed",
              ok: certificateReviewed,
              detail: certificateReviewed
                ? "SFC certificate rotation/review is confirmed."
                : `Set SFC_CERT_ROTATED_CONFIRMED=true or approve redacted certificate-review evidence; current evidence status is ${
                    certificateReviewEvidence?.status ?? "missing"
                  }.`,
            },
          ],
          externalActions: "none",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

async function readSku(sku: string): Promise<StockVisibilityResult> {
  const warehouseId = Number(envValue("SFC_SMOKE_WAREHOUSE_ID") || 1);
  const request = buildSfcStockPlan({ sku, warehouseId });
  assertSfcReadOnlyExecutionPlan(request);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: hydrateSfcRequestBodyForExecution(request),
      signal: AbortSignal.timeout(15_000),
    });
    const responseText = await response.text();
    const summary = summarizeSfcReadOnlyResponse(request, response, responseText);
    const ask = extractTag(responseText, "ask");
    const responseSku = extractTag(responseText, "sku");
    const visible = summary.ok && ask.toLowerCase() === "success" && responseSku === sku;

    return {
      sku,
      visible,
      action: "getStockBySKU",
      status: summary.status,
      statusText: summary.statusText,
      ok: summary.ok,
      ask,
      message: extractTag(responseText, "message"),
      responseSku,
      stock: extractTag(responseText, "stock"),
      physicalStock: extractTag(responseText, "M4XPhysicalStock"),
      virtualStock: extractTag(responseText, "M4XVirtualStock"),
      stockOnHold: extractTag(responseText, "stockOnHold"),
      putawayQuantity: extractTag(responseText, "putawayQuantity"),
      stockProblem: extractTag(responseText, "stockProblem"),
      warehouseId: extractTag(responseText, "warehouseId"),
      responseKind: summary.responseKind,
      responseBytes: summary.responseBytes,
      responseSha256: summary.responseSha256,
      hasSoapFault: summary.hasSoapFault,
      hasWsdlDocument: summary.hasWsdlDocument,
      containsCredentialEcho: summary.containsCredentialEcho,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 180) : "Unknown SFC product visibility error.";

    return {
      sku,
      visible: false,
      action: "getStockBySKU",
      status: 0,
      statusText: "request_failed",
      ok: false,
      ask: "",
      message: "",
      responseSku: "",
      stock: "",
      physicalStock: "",
      virtualStock: "",
      stockOnHold: "",
      putawayQuantity: "",
      stockProblem: "",
      warehouseId: "",
      responseKind: "unknown",
      responseBytes: 0,
      responseSha256: "",
      hasSoapFault: false,
      hasWsdlDocument: false,
      containsCredentialEcho: false,
      error: message,
    };
  }
}

async function main() {
  assertSafeRuntime();

  const skus = configuredSkus();
  const results: StockVisibilityResult[] = [];

  for (const sku of skus) {
    results.push(await readSku(sku));
  }

  const visible = results.filter((result) => result.visible).length;
  const ok = visible === results.length && results.every((result) => !result.hasSoapFault && !result.hasWsdlDocument && !result.containsCredentialEcho);

  console.log(
    JSON.stringify(
      {
        ok,
        checked: "sfc-product-visibility",
        provider: "sendfromchina",
        warehouseId: envValue("SFC_SMOKE_WAREHOUSE_ID") || "1",
        summary: {
          checked: results.length,
          visible,
          missing: results.length - visible,
          faults: results.filter((result) => result.hasSoapFault).length,
          wsdlDocuments: results.filter((result) => result.hasWsdlDocument).length,
          credentialEchoes: results.filter((result) => result.containsCredentialEcho).length,
        },
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
