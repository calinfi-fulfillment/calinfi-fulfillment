import type { FulfillmentRouteType, InventoryBatchStatus, InventoryLocationType, LineRole, OrderStatus } from "../domain";

export type InventorySupplyInput = {
  sku: string;
  title: string;
  locationCode: string;
  locationName: string;
  locationType: InventoryLocationType;
  batchCode: string;
  status: InventoryBatchStatus;
  plannedQuantity: number;
  producedQuantity: number;
  receivedQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
  damagedQuantity?: number;
  inTransitQuantity?: number;
  safetyStockQuantity?: number;
};

export type FulfillmentDemandInput = {
  sourceOrderKey: string;
  sourceLineKey: string;
  sku: string;
  title: string;
  quantity: number;
  lineRole: LineRole;
  orderStatus: OrderStatus;
  routeType?: FulfillmentRouteType;
  originalUnitAmountCents?: number;
  currentUnitAmountCents?: number;
  currency?: string;
  reservationRequired?: boolean;
};

export type InventoryAvailabilityStatus = "feed_ready" | "incoming" | "partial" | "short" | "stock_ready" | "no_demand";

export type InventoryAvailabilityLine = {
  sku: string;
  title: string;
  producedQuantity: number;
  receivedQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  inTransitQuantity: number;
  safetyStockQuantity: number;
  availableQuantity: number;
  demandQuantity: number;
  reservableQuantity: number;
  shortageQuantity: number;
  originalAmountCents: number;
  currentAmountCents: number;
  amountDeltaCents: number;
  currency: string;
  status: InventoryAvailabilityStatus;
  locations: string[];
  batches: string[];
};

export type FulfillmentStockFeedLine = {
  sku: string;
  title: string;
  availableQuantity: number;
  demandQuantity: number;
  reservableQuantity: number;
  shortageQuantity: number;
  originalAmountCents: number;
  currentAmountCents: number;
  amountDeltaCents: number;
  currency: string;
  status: InventoryAvailabilityStatus;
  externalActions: "none";
};

export type InventoryAvailabilitySummary = {
  totalProduced: number;
  totalOnHand: number;
  totalAvailable: number;
  totalDemand: number;
  totalReservable: number;
  totalShortage: number;
  totalOriginalAmountCents: number;
  totalCurrentAmountCents: number;
  totalAmountDeltaCents: number;
  currency: string;
  readySkuCount: number;
  incomingSkuCount: number;
  shortSkuCount: number;
  externalActions: "none";
};

function nonnegative(value: number | undefined) {
  return Math.max(0, Math.trunc(value ?? 0));
}

function needsReservation(demand: FulfillmentDemandInput) {
  if (demand.reservationRequired !== undefined) return demand.reservationRequired;
  if (demand.lineRole === "builtin") return false;

  return demand.orderStatus !== "cancelled" && demand.orderStatus !== "manual_hold";
}

function createEmptyLine(sku: string, title: string): InventoryAvailabilityLine {
  return {
    sku,
    title,
    producedQuantity: 0,
    receivedQuantity: 0,
    onHandQuantity: 0,
    reservedQuantity: 0,
    damagedQuantity: 0,
    inTransitQuantity: 0,
    safetyStockQuantity: 0,
    availableQuantity: 0,
    demandQuantity: 0,
    reservableQuantity: 0,
    shortageQuantity: 0,
    originalAmountCents: 0,
    currentAmountCents: 0,
    amountDeltaCents: 0,
    currency: "USD",
    status: "no_demand",
    locations: [],
    batches: [],
  };
}

function resolveStatus(line: InventoryAvailabilityLine): InventoryAvailabilityStatus {
  if (line.demandQuantity === 0) return line.availableQuantity > 0 ? "stock_ready" : "no_demand";
  if (line.availableQuantity >= line.demandQuantity) return "feed_ready";
  if (line.availableQuantity + line.inTransitQuantity >= line.demandQuantity) return "incoming";
  if (line.availableQuantity > 0) return "partial";

  return "short";
}

function unitAmount(value: number | undefined) {
  return Math.max(0, Math.trunc(value ?? 0));
}

export function buildInventoryAvailability(
  supplyInputs: readonly InventorySupplyInput[],
  demandInputs: readonly FulfillmentDemandInput[],
): InventoryAvailabilityLine[] {
  const lineBySku = new Map<string, InventoryAvailabilityLine>();

  for (const supply of supplyInputs) {
    const line = lineBySku.get(supply.sku) ?? createEmptyLine(supply.sku, supply.title);
    line.producedQuantity += nonnegative(supply.producedQuantity);
    line.receivedQuantity += nonnegative(supply.receivedQuantity);
    line.onHandQuantity += nonnegative(supply.onHandQuantity);
    line.reservedQuantity += nonnegative(supply.reservedQuantity);
    line.damagedQuantity += nonnegative(supply.damagedQuantity);
    line.inTransitQuantity += nonnegative(supply.inTransitQuantity);
    line.safetyStockQuantity += nonnegative(supply.safetyStockQuantity);
    line.locations = Array.from(new Set([...line.locations, supply.locationCode]));
    line.batches = Array.from(new Set([...line.batches, supply.batchCode]));
    lineBySku.set(supply.sku, line);
  }

  for (const demand of demandInputs) {
    const line = lineBySku.get(demand.sku) ?? createEmptyLine(demand.sku, demand.title);
    if (needsReservation(demand)) {
      const quantity = nonnegative(demand.quantity);
      const originalUnitAmountCents = unitAmount(demand.originalUnitAmountCents);
      const currentUnitAmountCents = unitAmount(demand.currentUnitAmountCents ?? demand.originalUnitAmountCents);
      line.demandQuantity += quantity;
      line.originalAmountCents += quantity * originalUnitAmountCents;
      line.currentAmountCents += quantity * currentUnitAmountCents;
      line.amountDeltaCents = line.currentAmountCents - line.originalAmountCents;
      line.currency = demand.currency ?? line.currency;
    }
    lineBySku.set(demand.sku, line);
  }

  const lines = Array.from(lineBySku.values()).map((line) => {
    const physicallyAvailable = line.onHandQuantity - line.reservedQuantity - line.damagedQuantity - line.safetyStockQuantity;
    line.availableQuantity = Math.max(0, physicallyAvailable);
    line.reservableQuantity = Math.min(line.availableQuantity, line.demandQuantity);
    line.shortageQuantity = Math.max(0, line.demandQuantity - line.availableQuantity);
    line.status = resolveStatus(line);

    return line;
  });

  return lines.sort((left, right) => {
    const demandDelta = Number(right.demandQuantity > 0) - Number(left.demandQuantity > 0);
    if (demandDelta !== 0) return demandDelta;
    const shortageDelta = right.shortageQuantity - left.shortageQuantity;
    if (shortageDelta !== 0) return shortageDelta;

    return left.sku.localeCompare(right.sku);
  });
}

export function buildFulfillmentStockFeed(lines: readonly InventoryAvailabilityLine[]): FulfillmentStockFeedLine[] {
  return lines
    .filter((line) => line.demandQuantity > 0)
    .map((line) => ({
      sku: line.sku,
      title: line.title,
      availableQuantity: line.availableQuantity,
      demandQuantity: line.demandQuantity,
      reservableQuantity: line.reservableQuantity,
      shortageQuantity: line.shortageQuantity,
      originalAmountCents: line.originalAmountCents,
      currentAmountCents: line.currentAmountCents,
      amountDeltaCents: line.amountDeltaCents,
      currency: line.currency,
      status: line.status,
      externalActions: "none",
    }));
}

export function summarizeInventoryAvailability(lines: readonly InventoryAvailabilityLine[]): InventoryAvailabilitySummary {
  return {
    totalProduced: lines.reduce((total, line) => total + line.producedQuantity, 0),
    totalOnHand: lines.reduce((total, line) => total + line.onHandQuantity, 0),
    totalAvailable: lines.reduce((total, line) => total + line.availableQuantity, 0),
    totalDemand: lines.reduce((total, line) => total + line.demandQuantity, 0),
    totalReservable: lines.reduce((total, line) => total + line.reservableQuantity, 0),
    totalShortage: lines.reduce((total, line) => total + line.shortageQuantity, 0),
    totalOriginalAmountCents: lines.reduce((total, line) => total + line.originalAmountCents, 0),
    totalCurrentAmountCents: lines.reduce((total, line) => total + line.currentAmountCents, 0),
    totalAmountDeltaCents: lines.reduce((total, line) => total + line.amountDeltaCents, 0),
    currency: lines.find((line) => line.currency)?.currency ?? "USD",
    readySkuCount: lines.filter((line) => line.status === "feed_ready" || line.status === "stock_ready").length,
    incomingSkuCount: lines.filter((line) => line.status === "incoming").length,
    shortSkuCount: lines.filter((line) => line.status === "partial" || line.status === "short").length,
    externalActions: "none",
  };
}

export const inventorySupplyFixtures: readonly InventorySupplyInput[] = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Ana Kutu",
    locationCode: "SFC-CN-01",
    locationName: "SFC China Hub",
    locationType: "sfc_warehouse",
    batchCode: "ODN-CORE-B01",
    status: "received",
    plannedQuantity: 120,
    producedQuantity: 120,
    receivedQuantity: 96,
    onHandQuantity: 72,
    reservedQuantity: 18,
    inTransitQuantity: 24,
    safetyStockQuantity: 6,
  },
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Ana Kutu",
    locationCode: "US-3PL-01",
    locationName: "US Regional 3PL",
    locationType: "regional_3pl",
    batchCode: "ODN-CORE-US01",
    status: "received",
    plannedQuantity: 24,
    producedQuantity: 24,
    receivedQuantity: 24,
    onHandQuantity: 20,
    reservedQuantity: 4,
    safetyStockQuantity: 0,
  },
  {
    sku: "CLF-ACC-STAND",
    title: "Stand",
    locationCode: "SFC-CN-01",
    locationName: "SFC China Hub",
    locationType: "sfc_warehouse",
    batchCode: "ACC-STAND-B01",
    status: "received",
    plannedQuantity: 80,
    producedQuantity: 80,
    receivedQuantity: 42,
    onHandQuantity: 18,
    reservedQuantity: 6,
    inTransitQuantity: 24,
    safetyStockQuantity: 4,
  },
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Eklentisi",
    locationCode: "FACTORY-CN-01",
    locationName: "China Factory",
    locationType: "factory",
    batchCode: "ACC-DDP-B01",
    status: "in_transit",
    plannedQuantity: 24,
    producedQuantity: 16,
    receivedQuantity: 0,
    onHandQuantity: 0,
    reservedQuantity: 0,
    inTransitQuantity: 8,
    safetyStockQuantity: 0,
  },
  {
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    locationCode: "FACTORY-CN-01",
    locationName: "China Factory",
    locationType: "factory",
    batchCode: "ACC-HND-B01",
    status: "produced",
    plannedQuantity: 120,
    producedQuantity: 120,
    receivedQuantity: 0,
    onHandQuantity: 0,
    reservedQuantity: 0,
    inTransitQuantity: 0,
    safetyStockQuantity: 0,
  },
] as const;

export const fulfillmentDemandFixtures: readonly FulfillmentDemandInput[] = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    sourceLineKey: "line-core-001",
    sku: "CLF-ODN-CORE",
    title: "ODUN Ana Kutu",
    quantity: 46,
    lineRole: "reward",
    orderStatus: "fulfillment_ready",
    routeType: "REGIONAL_3PL",
    originalUnitAmountCents: 64900,
    currentUnitAmountCents: 64900,
    currency: "USD",
  },
  {
    sourceOrderKey: "pm:synthetic-order-002",
    sourceLineKey: "line-stand-001",
    sku: "CLF-ACC-STAND",
    title: "Stand",
    quantity: 32,
    lineRole: "addon",
    orderStatus: "payment_pending",
    routeType: "REGIONAL_3PL",
    originalUnitAmountCents: 0,
    currentUnitAmountCents: 7900,
    currency: "USD",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    sourceLineKey: "line-ddp-001",
    sku: "CLF-ACC-DDP",
    title: "DDP Test Eklentisi",
    quantity: 12,
    lineRole: "addon",
    orderStatus: "fulfillment_ready",
    routeType: "CHINA_HK_DIRECT_DDP",
    originalUnitAmountCents: 0,
    currentUnitAmountCents: 11900,
    currency: "USD",
  },
  {
    sourceOrderKey: "pm:synthetic-order-001",
    sourceLineKey: "line-handle-001",
    sku: "CLF-ACC-UNI-HND",
    title: "Universal Handle",
    quantity: 46,
    lineRole: "builtin",
    orderStatus: "fulfillment_ready",
    routeType: "REGIONAL_3PL",
    originalUnitAmountCents: 0,
    currentUnitAmountCents: 0,
    currency: "USD",
  },
] as const;
