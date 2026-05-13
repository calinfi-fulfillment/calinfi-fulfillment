import type { FulfillmentRouteType, ShippingMode } from "../domain";

export const NETWORK_ROUTE_FAMILIES = [
  "SFC_ASIA_DIRECT_DDP",
  "SFC_TO_US_FREIGHT_EASYSHIP",
  "SFC_TO_EU_FREIGHT_EASYSHIP",
  "MANUAL_SPECIAL",
] as const;

export const NETWORK_ORIGIN_NODES = ["SFC_CHINA"] as const;

export const NETWORK_REGIONAL_NODES = ["SFC_DIRECT", "US_3PL", "EU_3PL", "MANUAL"] as const;

export type NetworkRouteFamily = (typeof NETWORK_ROUTE_FAMILIES)[number];
export type NetworkOriginNode = (typeof NETWORK_ORIGIN_NODES)[number];
export type NetworkRegionalNode = (typeof NETWORK_REGIONAL_NODES)[number];
export type NetworkProvider = "sendfromchina" | "easyship" | "manual";

export type NetworkRouteRequest = {
  countryCode: string;
};

export type NetworkRoutePlan = {
  routeFamily: NetworkRouteFamily;
  originNode: NetworkOriginNode;
  regionalNode: NetworkRegionalNode;
  routeType: FulfillmentRouteType;
  shippingMode: ShippingMode;
  freightLegProvider: NetworkProvider;
  lastMileProvider: NetworkProvider;
  requiresRegionalFreight: boolean;
  sendsBackerPiiToSfc: boolean;
  description: string;
};
