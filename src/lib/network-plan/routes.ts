import type { NetworkRoutePlan, NetworkRouteRequest } from "./types";

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

const ASIA_DIRECT_DDP_COUNTRY_CODES = new Set(["HK", "MO", "SG", "TW", "JP", "KR", "MY", "TH", "PH", "ID", "VN"]);

export function resolveNetworkRoute(request: NetworkRouteRequest): NetworkRoutePlan {
  const countryCode = request.countryCode.toUpperCase();

  if (countryCode === "US") {
    return {
      routeFamily: "SFC_TO_US_FREIGHT_EASYSHIP",
      originNode: "SFC_CHINA",
      regionalNode: "US_3PL",
      routeType: "REGIONAL_3PL",
      shippingMode: "3PL_INTERNAL_LABEL",
      freightLegProvider: "sendfromchina",
      lastMileProvider: "easyship",
      requiresRegionalFreight: true,
      sendsBackerPiiToSfc: false,
      description: "SFC prepares China-to-US freight; Easyship handles US regional last-mile.",
    };
  }

  if (EU_COUNTRY_CODES.has(countryCode)) {
    return {
      routeFamily: "SFC_TO_EU_FREIGHT_EASYSHIP",
      originNode: "SFC_CHINA",
      regionalNode: "EU_3PL",
      routeType: "REGIONAL_3PL",
      shippingMode: "3PL_INTERNAL_LABEL",
      freightLegProvider: "sendfromchina",
      lastMileProvider: "easyship",
      requiresRegionalFreight: true,
      sendsBackerPiiToSfc: false,
      description: "SFC prepares China-to-EU freight; Easyship handles EU regional last-mile.",
    };
  }

  if (ASIA_DIRECT_DDP_COUNTRY_CODES.has(countryCode)) {
    return {
      routeFamily: "SFC_ASIA_DIRECT_DDP",
      originNode: "SFC_CHINA",
      regionalNode: "SFC_DIRECT",
      routeType: "CHINA_HK_DIRECT_DDP",
      shippingMode: "DIRECT_DDP_PROVIDER",
      freightLegProvider: "sendfromchina",
      lastMileProvider: "sendfromchina",
      requiresRegionalFreight: false,
      sendsBackerPiiToSfc: true,
      description: "SFC ships direct DDP from China/HK to the Asia destination.",
    };
  }

  return {
    routeFamily: "MANUAL_SPECIAL",
    originNode: "SFC_CHINA",
    regionalNode: "MANUAL",
    routeType: "MANUAL_SPECIAL",
    shippingMode: "MANUAL_LABEL",
    freightLegProvider: "manual",
    lastMileProvider: "manual",
    requiresRegionalFreight: false,
    sendsBackerPiiToSfc: false,
    description: "Manual route review is required before a provider receives data.",
  };
}
