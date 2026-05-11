export function calculateQuoteBufferCents(amountCents: number) {
  const percentageBuffer = Math.ceil(amountCents * 0.05);
  const minimumBuffer = 300;
  return Math.ceil(Math.max(percentageBuffer, minimumBuffer) / 100) * 100;
}
