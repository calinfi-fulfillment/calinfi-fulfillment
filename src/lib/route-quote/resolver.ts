import type { RouteDecision, RouteRequest, RouteRule } from "./types";

export const DEFAULT_ROUTE_DECISION: RouteDecision = {
  routeType: "REGIONAL_3PL",
  shippingMode: "3PL_INTERNAL_LABEL",
  matchedRuleName: "default-regional-3pl",
};

export function resolveRoute(request: RouteRequest, rules: RouteRule[]): RouteDecision {
  const countryCode = request.countryCode.toUpperCase();
  const regionCode = request.regionCode?.toUpperCase();
  const matchingRule = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority)
    .find((rule) => {
      const countryMatches = !rule.countryCode || rule.countryCode.toUpperCase() === countryCode;
      const regionMatches = !rule.regionCode || rule.regionCode.toUpperCase() === regionCode;
      return countryMatches && regionMatches;
    });

  if (!matchingRule) {
    return DEFAULT_ROUTE_DECISION;
  }

  return {
    routeType: matchingRule.routeType,
    shippingMode: matchingRule.shippingMode,
    matchedRuleName: matchingRule.ruleName,
  };
}
