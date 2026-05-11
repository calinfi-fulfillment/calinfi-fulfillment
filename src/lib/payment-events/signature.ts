import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function signPaymentEventPayload(rawBody: string, secret: string) {
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyPaymentEventSignature(rawBody: string, signature: string | null | undefined, secret: string | undefined) {
  if (!secret || !signature?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expected = signPaymentEventPayload(rawBody, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
