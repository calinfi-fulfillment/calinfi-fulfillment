import { createHash } from "node:crypto";

import type { SafetyEnv } from "../safety";
import type { SfcSoapAction, SfcSoapRequestPlan } from "./request";

export type SfcReadOnlyExecutionSummary = {
  action: SfcSoapAction;
  status: number;
  statusText: string;
  ok: boolean;
  contentType: string;
  responseBytes: number;
  responseSha256: string;
  hasSoapFault: boolean;
  containsCredentialEcho: boolean;
};

const READ_ONLY_ACTIONS = new Set<SfcSoapAction>(["getWarehouse", "getShippingMethod", "getRate", "getRateByMode", "getStock"]);

function envValue(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function configuredCredentialValues(env: SafetyEnv) {
  return [envValue(env, "SFC_CUSTOMER_ID"), envValue(env, "SFC_APP_TOKEN"), envValue(env, "SFC_APP_KEY")].filter(
    (value) => value.length >= 4,
  );
}

export function assertSfcReadOnlyExecutionPlan(request: SfcSoapRequestPlan) {
  if (!READ_ONLY_ACTIONS.has(request.action)) {
    throw new Error(`SFC action ${request.action} is not allowed in read-only smoke execution.`);
  }

  if (request.mutation) {
    throw new Error(`SFC action ${request.action} is marked as a mutation and cannot be executed by this smoke.`);
  }

  if (request.externalActions !== "none") {
    throw new Error(`SFC action ${request.action} has unexpected externalActions=${request.externalActions}.`);
  }
}

export function hydrateSfcRequestBodyForExecution(request: SfcSoapRequestPlan, env: SafetyEnv = process.env) {
  assertSfcReadOnlyExecutionPlan(request);

  const customerId = envValue(env, "SFC_CUSTOMER_ID");
  const appToken = envValue(env, "SFC_APP_TOKEN");
  const appKey = envValue(env, "SFC_APP_KEY");

  if (!customerId || !appToken || !appKey) {
    throw new Error("SFC credentials are required for read-only smoke execution.");
  }

  return request.body
    .replace("<customerId>&lt;configured&gt;</customerId>", `<customerId>${escapeXml(customerId)}</customerId>`)
    .replace("<appToken>&lt;configured&gt;</appToken>", `<appToken>${escapeXml(appToken)}</appToken>`)
    .replace("<appKey>&lt;configured&gt;</appKey>", `<appKey>${escapeXml(appKey)}</appKey>`);
}

export function summarizeSfcReadOnlyResponse(
  request: SfcSoapRequestPlan,
  response: Pick<Response, "ok" | "status" | "statusText" | "headers">,
  responseText: string,
  env: SafetyEnv = process.env,
): SfcReadOnlyExecutionSummary {
  const containsCredentialEcho = configuredCredentialValues(env).some((value) => responseText.includes(value));
  const hasSoapFault = /<(?:\w+:)?Fault[\s>]/i.test(responseText) || /faultstring/i.test(responseText);
  const responseSha256 = createHash("sha256").update(responseText).digest("hex");

  return {
    action: request.action,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok && !hasSoapFault && !containsCredentialEcho,
    contentType: response.headers.get("content-type") ?? "unknown",
    responseBytes: Buffer.byteLength(responseText, "utf8"),
    responseSha256,
    hasSoapFault,
    containsCredentialEcho,
  };
}
