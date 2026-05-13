import type { NetworkRegionalNode, NetworkRouteFamily } from "./types";

type RegionalRouteFamily = Extract<NetworkRouteFamily, "SFC_TO_US_FREIGHT_EASYSHIP" | "SFC_TO_EU_FREIGHT_EASYSHIP">;
type RegionalNode = Extract<NetworkRegionalNode, "US_3PL" | "EU_3PL">;

export type FreightBatchLineInput = {
  sourceOrderKey: string;
  routeFamily: RegionalRouteFamily;
  regionalNode: RegionalNode;
  sku: string;
  quantity: number;
  unitWeightKg: number;
  unitVolumeCbm: number;
};

export type FreightBatchLine = FreightBatchLineInput & {
  lineWeightKg: number;
  lineVolumeCbm: number;
};

export type FreightBatchManifestLine = {
  sku: string;
  quantity: number;
  totalWeightKg: number;
  totalVolumeCbm: number;
};

export type FreightBatchPlan = {
  batchId: string;
  routeFamily: RegionalRouteFamily;
  regionalNode: RegionalNode;
  originNode: "SFC_CHINA";
  freightLegProvider: "sendfromchina";
  orderCount: number;
  totalQuantity: number;
  totalWeightKg: number;
  totalVolumeCbm: number;
  sourceOrderKeys: string[];
  manifestLines: FreightBatchManifestLine[];
  containsBackerPii: false;
  externalActions: "none";
};

export type FreightBatchPlanningResult = {
  batches: FreightBatchPlan[];
  rejectedLines: Array<{
    sourceOrderKey: string;
    reason: string;
  }>;
  externalActions: "none";
};

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive.`);
  }
}

function round(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function batchKey(routeFamily: RegionalRouteFamily, regionalNode: RegionalNode) {
  return `${routeFamily}:${regionalNode}`;
}

function batchIdFor(routeFamily: RegionalRouteFamily, regionalNode: RegionalNode) {
  return `sfc-${regionalNode.toLowerCase().replace("_", "-")}-${routeFamily === "SFC_TO_US_FREIGHT_EASYSHIP" ? "us" : "eu"}-preview`;
}

function expectedNode(routeFamily: RegionalRouteFamily): RegionalNode {
  return routeFamily === "SFC_TO_US_FREIGHT_EASYSHIP" ? "US_3PL" : "EU_3PL";
}

function toLine(input: FreightBatchLineInput): FreightBatchLine {
  if (!input.sourceOrderKey.trim()) throw new Error("sourceOrderKey is required.");
  if (!input.sku.trim()) throw new Error("sku is required.");
  positive(input.quantity, "quantity");
  positive(input.unitWeightKg, "unitWeightKg");
  positive(input.unitVolumeCbm, "unitVolumeCbm");

  return {
    ...input,
    lineWeightKg: round(input.quantity * input.unitWeightKg),
    lineVolumeCbm: round(input.quantity * input.unitVolumeCbm),
  };
}

export function createFreightBatchPlan(lines: readonly FreightBatchLineInput[]): FreightBatchPlanningResult {
  const grouped = new Map<string, FreightBatchLine[]>();
  const rejectedLines: FreightBatchPlanningResult["rejectedLines"] = [];

  for (const input of lines) {
    if (input.regionalNode !== expectedNode(input.routeFamily)) {
      rejectedLines.push({
        sourceOrderKey: input.sourceOrderKey,
        reason: `${input.routeFamily} must use ${expectedNode(input.routeFamily)}.`,
      });
      continue;
    }

    const line = toLine(input);
    const key = batchKey(line.routeFamily, line.regionalNode);
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
  }

  const batches = [...grouped.values()].map((batchLines) => {
    const first = batchLines[0]!;
    const sourceOrderKeys = [...new Set(batchLines.map((line) => line.sourceOrderKey))].sort();
    const manifest = new Map<string, FreightBatchManifestLine>();

    for (const line of batchLines) {
      const existing = manifest.get(line.sku) ?? {
        sku: line.sku,
        quantity: 0,
        totalWeightKg: 0,
        totalVolumeCbm: 0,
      };

      manifest.set(line.sku, {
        sku: line.sku,
        quantity: existing.quantity + line.quantity,
        totalWeightKg: round(existing.totalWeightKg + line.lineWeightKg),
        totalVolumeCbm: round(existing.totalVolumeCbm + line.lineVolumeCbm),
      });
    }

    return {
      batchId: batchIdFor(first.routeFamily, first.regionalNode),
      routeFamily: first.routeFamily,
      regionalNode: first.regionalNode,
      originNode: "SFC_CHINA",
      freightLegProvider: "sendfromchina",
      orderCount: sourceOrderKeys.length,
      totalQuantity: batchLines.reduce((total, line) => total + line.quantity, 0),
      totalWeightKg: round(batchLines.reduce((total, line) => total + line.lineWeightKg, 0)),
      totalVolumeCbm: round(batchLines.reduce((total, line) => total + line.lineVolumeCbm, 0)),
      sourceOrderKeys,
      manifestLines: [...manifest.values()].sort((a, b) => a.sku.localeCompare(b.sku)),
      containsBackerPii: false,
      externalActions: "none",
    } satisfies FreightBatchPlan;
  });

  return {
    batches: batches.sort((a, b) => a.batchId.localeCompare(b.batchId)),
    rejectedLines,
    externalActions: "none",
  };
}
