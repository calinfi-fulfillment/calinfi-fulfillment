import { createHash } from "node:crypto";

export type OrderQuoteFingerprintInput = {
  sourceOrderKey: string;
  countryCode: string;
  lines: Array<{
    sku: string;
    quantity: number;
  }>;
};

export function createOrderQuoteFingerprint(input: OrderQuoteFingerprintInput) {
  const normalized = {
    sourceOrderKey: input.sourceOrderKey,
    countryCode: input.countryCode.toUpperCase(),
    lines: [...input.lines]
      .map((line) => ({ sku: line.sku, quantity: line.quantity }))
      .sort((a, b) => a.sku.localeCompare(b.sku)),
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
