import type { NetworkRegionalNode, NetworkRouteFamily } from "../network-plan";
import type { QuoteRequest } from "../route-quote";
import { buildEasyshipRatesRequestPlan, type EasyshipAddressSchema, type EasyshipHttpRequestPlan } from "./request";

type EasyshipAddress = typeof EasyshipAddressSchema._output;

export type RegionalEasyshipRatePlanInput = {
  routeFamily: Extract<NetworkRouteFamily, "SFC_TO_US_FREIGHT_EASYSHIP" | "SFC_TO_EU_FREIGHT_EASYSHIP">;
  regionalNode: Extract<NetworkRegionalNode, "US_3PL" | "EU_3PL">;
  quoteRequest: QuoteRequest;
  destinationAddress: EasyshipAddress;
  box: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in";
  };
  totalActualWeightKg: number;
};

export type RegionalEasyshipRatePlan = {
  provider: "easyship";
  routeFamily: RegionalEasyshipRatePlanInput["routeFamily"];
  regionalNode: RegionalEasyshipRatePlanInput["regionalNode"];
  purpose: "regional_last_mile";
  request: EasyshipHttpRequestPlan;
  externalActions: "none";
};

const REGIONAL_ORIGIN_ADDRESSES: Record<RegionalEasyshipRatePlanInput["regionalNode"], EasyshipAddress> = {
  US_3PL: {
    country_alpha2: "US",
    line_1: "US regional warehouse preview",
    city: "Los Angeles",
    state: "CA",
    postal_code: "90001",
  },
  EU_3PL: {
    country_alpha2: "DE",
    line_1: "EU regional warehouse preview",
    city: "Berlin",
    postal_code: "10115",
  },
};

export function buildRegionalEasyshipRatePlan(
  input: RegionalEasyshipRatePlanInput,
  env: Partial<Record<string, string | undefined>> = process.env,
): RegionalEasyshipRatePlan {
  const expectedRegionalNode = input.routeFamily === "SFC_TO_US_FREIGHT_EASYSHIP" ? "US_3PL" : "EU_3PL";
  if (input.regionalNode !== expectedRegionalNode) {
    throw new Error(`${input.routeFamily} must use ${expectedRegionalNode}.`);
  }

  return {
    provider: "easyship",
    routeFamily: input.routeFamily,
    regionalNode: input.regionalNode,
    purpose: "regional_last_mile",
    request: buildEasyshipRatesRequestPlan(
      {
        quoteRequest: input.quoteRequest,
        originAddress: REGIONAL_ORIGIN_ADDRESSES[input.regionalNode],
        destinationAddress: input.destinationAddress,
        box: input.box,
        totalActualWeightKg: input.totalActualWeightKg,
        incoterms: "DDU",
        calculateTaxAndDuties: false,
      },
      env,
    ),
    externalActions: "none",
  };
}
