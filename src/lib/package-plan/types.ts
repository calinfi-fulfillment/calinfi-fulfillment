import type { IssueSeverity, LineRole, PackageProductType } from "../domain";

export type PackageBoxType = "main" | "accessory_bundle" | "separate" | "custom";

export type FulfillmentProductSnapshot = {
  sku: string;
  title: string;
  productType?: PackageProductType;
  isBuiltinMainBoxItem?: boolean;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  hsCode?: string | null;
  countryOfOrigin?: string | null;
  customsDescription?: string | null;
  declaredValueCents?: number | null;
  declaredValueCurrency?: string | null;
  canBundleWithMainBox?: boolean | null;
  canBundleWithAccessories?: boolean | null;
  requiresSeparateBox?: boolean | null;
  bundleGroup?: string | null;
  capacityUnits?: number | null;
  shipGroup?: string | null;
  preferredBoxSku?: string | null;
  manualReviewRequired?: boolean | null;
};

export type PackagePlanOrderLine = {
  sourceLineKey: string;
  sku: string;
  title: string;
  quantity: number;
  lineRole: LineRole;
  isBuiltinMainBoxItem?: boolean;
};

export type BoxCatalogEntry = {
  boxSku: string;
  title: string;
  boxType: PackageBoxType;
  sfcBoxSku?: string;
  outerLengthMm: number;
  outerWidthMm: number;
  outerHeightMm: number;
  tareWeightGrams: number;
  maxWeightGrams: number;
  maxAccessoryCapacityUnits?: number;
  allowedBundleGroups?: string[];
  packagingCostCents: number;
  currency: string;
  readyForDirectShipment: boolean;
  priority?: number;
};

export type PackagePlanInput = {
  orderId: string;
  sourceOrderKey: string;
  catalogVersion: string;
  packagePlanVersion: string;
  currency: string;
  destinationCountryCode: string;
  lines: PackagePlanOrderLine[];
  products: FulfillmentProductSnapshot[];
  boxes: BoxCatalogEntry[];
};

export type PackagePlanItem = {
  sourceLineKey: string;
  sku: string;
  title: string;
  quantity: number;
  lineRole: LineRole;
  weightGrams: number;
  declaredValueCents: number;
  bundleGroup: string;
  capacityUnits: number;
};

export type PackagePlanCustomsLine = {
  sku: string;
  title: string;
  quantity: number;
  hsCode?: string;
  countryOfOrigin?: string;
  customsDescription?: string;
  declaredValueCents: number;
  currency: string;
};

export type PackagePlanUnit = {
  packageId: string;
  boxSku: string;
  sfcBoxSku?: string;
  boxType: PackageBoxType;
  title: string;
  items: PackagePlanItem[];
  customsLines: PackagePlanCustomsLine[];
  totalWeightGrams: number;
  outerLengthMm: number;
  outerWidthMm: number;
  outerHeightMm: number;
  packagingCostCents: number;
  declaredValueCents: number;
  readyForDirectShipment: boolean;
  packingInstruction: string;
};

export type PackagePlanIssue = {
  code: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  sku?: string;
  boxSku?: string;
};

export type PackagePlanResult = {
  orderId: string;
  sourceOrderKey: string;
  catalogVersion: string;
  packagePlanVersion: string;
  destinationCountryCode: string;
  status: "ready" | "needs_review" | "blocked";
  packageUnits: PackagePlanUnit[];
  issues: PackagePlanIssue[];
  summary: {
    packageCount: number;
    itemQuantity: number;
    totalWeightGrams: number;
    packagingCostCents: number;
    declaredValueCents: number;
    currency: string;
  };
  fingerprint: string;
  externalActions: "none";
};
