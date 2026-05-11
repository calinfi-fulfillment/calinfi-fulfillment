import { createHmac, timingSafeEqual } from "node:crypto";

import type { SafetyEnv } from "../safety";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
const STRIPE_WEBHOOK_SECRET_PREFIX = ["wh", "sec_"].join("");

export type StripeWebhookSignatureResult =
  | {
      ok: true;
      timestamp: number;
    }
  | {
      ok: false;
      code:
        | "stripe_webhook_secret_missing"
        | "stripe_webhook_secret_invalid"
        | "stripe_signature_missing"
        | "stripe_signature_invalid"
        | "stripe_signature_stale";
      issues: string[];
    };

function envValue(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

export function stripeWebhookSecret(env: SafetyEnv = process.env) {
  return envValue(env, "STRIPE_WEBHOOK_SECRET");
}

export function hasStripeWebhookSecretPrefix(secret: string) {
  return secret.startsWith(STRIPE_WEBHOOK_SECRET_PREFIX);
}

function parseStripeSignatureHeader(signatureHeader: string | null | undefined) {
  const entries = String(signatureHeader ?? "")
    .split(",")
    .map((part) => part.trim().split("="))
    .filter((entry): entry is [string, string] => entry.length === 2 && Boolean(entry[0]) && Boolean(entry[1]));

  const timestamp = Number.parseInt(entries.find(([key]) => key === "t")?.[1] ?? "", 10);
  const signatures = entries.filter(([key]) => key === "v1").map(([, value]) => value);

  return {
    timestamp,
    signatures,
  };
}

function digestPayload(rawBody: string, timestamp: number, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSyntheticStripeSignatureHeader(input: {
  rawBody: string;
  secret: string;
  timestamp: number;
}) {
  const digest = digestPayload(input.rawBody, input.timestamp, input.secret);
  return `t=${input.timestamp},v1=${digest}`;
}

export function verifyStripeWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret?: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): StripeWebhookSignatureResult {
  const secret = String(input.secret ?? "").trim();

  if (!secret) {
    return {
      ok: false,
      code: "stripe_webhook_secret_missing",
      issues: ["Stripe webhook secret is missing."],
    };
  }

  if (!hasStripeWebhookSecretPrefix(secret)) {
    return {
      ok: false,
      code: "stripe_webhook_secret_invalid",
      issues: ["Stripe webhook secret must be an endpoint signing secret."],
    };
  }

  const parsed = parseStripeSignatureHeader(input.signatureHeader);

  if (!Number.isFinite(parsed.timestamp) || parsed.signatures.length === 0) {
    return {
      ok: false,
      code: "stripe_signature_missing",
      issues: ["Stripe signature header is missing timestamp or signature."],
    };
  }

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const toleranceSeconds = input.toleranceSeconds ?? STRIPE_SIGNATURE_TOLERANCE_SECONDS;

  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return {
      ok: false,
      code: "stripe_signature_stale",
      issues: ["Stripe signature timestamp is outside tolerance."],
    };
  }

  const expectedDigest = digestPayload(input.rawBody, parsed.timestamp, secret);
  const signatureMatches = parsed.signatures.some((signature) => safeEqualHex(expectedDigest, signature));

  if (!signatureMatches) {
    return {
      ok: false,
      code: "stripe_signature_invalid",
      issues: ["Stripe signature does not match request body."],
    };
  }

  return {
    ok: true,
    timestamp: parsed.timestamp,
  };
}
