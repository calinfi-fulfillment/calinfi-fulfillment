import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function signPmIntakePayload(rawBody: string, secret: string) {
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyPmIntakeSignature(rawBody: string, signature: string | null | undefined, secret: string | undefined) {
  if (!secret || !signature?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expected = signPmIntakePayload(rawBody, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
