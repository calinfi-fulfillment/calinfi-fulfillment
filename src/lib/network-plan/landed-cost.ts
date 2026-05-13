import { calculateQuoteBufferCents } from "../route-quote";
import type { NetworkRouteFamily } from "./types";

export type LandedCostComponent = {
  label: string;
  cents: number;
};

export type LandedCostInput = {
  routeFamily: Extract<NetworkRouteFamily, "SFC_TO_US_FREIGHT_EASYSHIP" | "SFC_TO_EU_FREIGHT_EASYSHIP">;
  currency: string;
  orderChargeableWeightKg: number;
  batchChargeableWeightKg: number;
  bulkFreightCents: number;
  importDutyCents: number;
  regionalReceivingCents: number;
  regionalHandlingCents: number;
  easyshipLastMileCents: number;
};

export type LandedCostPreview = {
  routeFamily: LandedCostInput["routeFamily"];
  currency: string;
  freightShareRatio: number;
  components: LandedCostComponent[];
  subtotalCents: number;
  bufferCents: number;
  totalCents: number;
  externalActions: "none";
};

function nonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer cent amount.`);
  }
}

export function calculateFreightShareCents(input: Pick<LandedCostInput, "batchChargeableWeightKg" | "bulkFreightCents" | "orderChargeableWeightKg">) {
  if (input.orderChargeableWeightKg <= 0) throw new Error("orderChargeableWeightKg must be positive.");
  if (input.batchChargeableWeightKg <= 0) throw new Error("batchChargeableWeightKg must be positive.");
  if (input.orderChargeableWeightKg > input.batchChargeableWeightKg) {
    throw new Error("orderChargeableWeightKg cannot exceed batchChargeableWeightKg.");
  }
  nonNegativeInteger(input.bulkFreightCents, "bulkFreightCents");

  return Math.ceil(input.bulkFreightCents * (input.orderChargeableWeightKg / input.batchChargeableWeightKg));
}

export function createLandedCostPreview(input: LandedCostInput): LandedCostPreview {
  for (const [label, value] of Object.entries({
    bulkFreightCents: input.bulkFreightCents,
    importDutyCents: input.importDutyCents,
    regionalReceivingCents: input.regionalReceivingCents,
    regionalHandlingCents: input.regionalHandlingCents,
    easyshipLastMileCents: input.easyshipLastMileCents,
  })) {
    nonNegativeInteger(value, label);
  }

  const freightShareCents = calculateFreightShareCents(input);
  const components = [
    { label: "SFC bulk freight share", cents: freightShareCents },
    { label: "Import duty and tax estimate", cents: input.importDutyCents },
    { label: "Regional receiving", cents: input.regionalReceivingCents },
    { label: "Regional handling", cents: input.regionalHandlingCents },
    { label: "Easyship regional last-mile", cents: input.easyshipLastMileCents },
  ];
  const subtotalCents = components.reduce((total, component) => total + component.cents, 0);
  const bufferCents = calculateQuoteBufferCents(subtotalCents);

  return {
    routeFamily: input.routeFamily,
    currency: input.currency,
    freightShareRatio: input.orderChargeableWeightKg / input.batchChargeableWeightKg,
    components,
    subtotalCents,
    bufferCents,
    totalCents: subtotalCents + bufferCents,
    externalActions: "none",
  };
}
