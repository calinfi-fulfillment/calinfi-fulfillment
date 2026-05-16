import { createHash } from "node:crypto";

import type {
  BoxCatalogEntry,
  FulfillmentProductSnapshot,
  PackagePlanCustomsLine,
  PackagePlanInput,
  PackagePlanIssue,
  PackagePlanItem,
  PackagePlanResult,
  PackagePlanUnit,
} from "./types";

type ExpandedUnit = {
  line: PackagePlanInput["lines"][number];
  product: FulfillmentProductSnapshot;
};

type DraftPackage = Omit<
  PackagePlanUnit,
  "customsLines" | "totalWeightGrams" | "declaredValueCents" | "packingInstruction"
> & {
  box: BoxCatalogEntry;
};

const PACKAGE_PLAN_HASH_VERSION = "package-plan:v1";
const DEFAULT_BUNDLE_GROUP = "default_accessory";

function normalizeCountryCode(countryCode: string) {
  return countryCode.trim().toUpperCase();
}

function bySmallestUsableBox(a: BoxCatalogEntry, b: BoxCatalogEntry) {
  const priority = (a.priority ?? 100) - (b.priority ?? 100);
  if (priority !== 0) return priority;

  const aCapacity = a.maxAccessoryCapacityUnits ?? Number.MAX_SAFE_INTEGER;
  const bCapacity = b.maxAccessoryCapacityUnits ?? Number.MAX_SAFE_INTEGER;
  if (aCapacity !== bCapacity) return aCapacity - bCapacity;

  const aVolume = a.outerLengthMm * a.outerWidthMm * a.outerHeightMm;
  const bVolume = b.outerLengthMm * b.outerWidthMm * b.outerHeightMm;
  return aVolume - bVolume;
}

function createPackagePlanFingerprint(result: Omit<PackagePlanResult, "fingerprint">) {
  const normalized = {
    version: PACKAGE_PLAN_HASH_VERSION,
    orderId: result.orderId,
    sourceOrderKey: result.sourceOrderKey,
    catalogVersion: result.catalogVersion,
    packagePlanVersion: result.packagePlanVersion,
    destinationCountryCode: normalizeCountryCode(result.destinationCountryCode),
    packageUnits: result.packageUnits.map((unit) => ({
      boxSku: unit.boxSku,
      sfcBoxSku: unit.sfcBoxSku,
      totalWeightGrams: unit.totalWeightGrams,
      dimensions: [unit.outerLengthMm, unit.outerWidthMm, unit.outerHeightMm],
      items: unit.items
        .map((item) => ({ sku: item.sku, quantity: item.quantity }))
        .sort((a, b) => a.sku.localeCompare(b.sku)),
    })),
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function positiveOrZero(value: number | null | undefined) {
  return value && value > 0 ? value : 0;
}

function capacityUnits(product: FulfillmentProductSnapshot) {
  return product.capacityUnits !== null && product.capacityUnits !== undefined && product.capacityUnits >= 0 ? product.capacityUnits : 1;
}

function bundleGroup(product: FulfillmentProductSnapshot) {
  return product.bundleGroup?.trim() || DEFAULT_BUNDLE_GROUP;
}

function issue(issues: PackagePlanIssue[], nextIssue: PackagePlanIssue) {
  issues.push(nextIssue);
}

function recordProductDataIssues(product: FulfillmentProductSnapshot, issues: PackagePlanIssue[]) {
  if (product.manualReviewRequired) {
    issue(issues, {
      code: "product_manual_review_required",
      severity: "warning",
      title: "Product requires packing review",
      detail: `${product.sku} is marked manual_review_required in the Product Master snapshot.`,
      sku: product.sku,
    });
  }

  const missingPhysicalFields = [
    ["weightGrams", product.weightGrams],
    ["lengthMm", product.lengthMm],
    ["widthMm", product.widthMm],
    ["heightMm", product.heightMm],
  ].filter(([, value]) => !value || Number(value) <= 0);

  for (const [field] of missingPhysicalFields) {
    issue(issues, {
      code: "missing_package_physical_field",
      severity: "warning",
      title: "Package physical field missing",
      detail: `${product.sku}.${field} is missing from the Product Master snapshot.`,
      sku: product.sku,
    });
  }

  const missingCustomsFields = [
    ["hsCode", product.hsCode],
    ["countryOfOrigin", product.countryOfOrigin],
    ["customsDescription", product.customsDescription],
    ["declaredValueCents", product.declaredValueCents],
    ["declaredValueCurrency", product.declaredValueCurrency],
  ].filter(([, value]) => value === null || value === undefined || value === "");

  for (const [field] of missingCustomsFields) {
    issue(issues, {
      code: "missing_package_customs_field",
      severity: "warning",
      title: "Package customs field missing",
      detail: `${product.sku}.${field} is missing from the Product Master snapshot.`,
      sku: product.sku,
    });
  }
}

function createItem(unit: ExpandedUnit): PackagePlanItem {
  const product = unit.product;

  return {
    sourceLineKey: unit.line.sourceLineKey,
    sku: unit.line.sku,
    title: unit.line.title,
    quantity: 1,
    lineRole: unit.line.lineRole,
    weightGrams: positiveOrZero(product.weightGrams),
    declaredValueCents: positiveOrZero(product.declaredValueCents),
    bundleGroup: bundleGroup(product),
    capacityUnits: capacityUnits(product),
  };
}

function aggregateItem(items: PackagePlanItem[], nextItem: PackagePlanItem) {
  const existing = items.find((item) => item.sourceLineKey === nextItem.sourceLineKey && item.sku === nextItem.sku);
  if (existing) {
    existing.quantity += nextItem.quantity;
    return;
  }

  items.push(nextItem);
}

function customsLinesForItems(
  items: PackagePlanItem[],
  productBySku: Map<string, FulfillmentProductSnapshot>,
  currency: string,
): PackagePlanCustomsLine[] {
  return items.map((item) => {
    const product = productBySku.get(item.sku);

    return {
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      hsCode: product?.hsCode ?? undefined,
      countryOfOrigin: product?.countryOfOrigin ?? undefined,
      customsDescription: product?.customsDescription ?? undefined,
      declaredValueCents: item.declaredValueCents * item.quantity,
      currency: product?.declaredValueCurrency ?? currency,
    };
  });
}

function finishPackage(draft: DraftPackage, productBySku: Map<string, FulfillmentProductSnapshot>, currency: string): PackagePlanUnit {
  const customsLines = customsLinesForItems(draft.items, productBySku, currency);
  const totalItemWeightGrams = draft.items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
  const declaredValueCents = draft.items.reduce((sum, item) => sum + item.declaredValueCents * item.quantity, 0);
  const itemSummary = draft.items.map((item) => `${item.sku} x${item.quantity}`).join(", ");

  return {
    packageId: draft.packageId,
    boxSku: draft.boxSku,
    sfcBoxSku: draft.sfcBoxSku,
    boxType: draft.boxType,
    title: draft.title,
    items: draft.items,
    customsLines,
    totalWeightGrams: draft.box.tareWeightGrams + totalItemWeightGrams,
    outerLengthMm: draft.outerLengthMm,
    outerWidthMm: draft.outerWidthMm,
    outerHeightMm: draft.outerHeightMm,
    packagingCostCents: draft.packagingCostCents,
    declaredValueCents,
    readyForDirectShipment: draft.readyForDirectShipment,
    packingInstruction: `Use ${draft.sfcBoxSku ?? draft.boxSku}; pack ${itemSummary}.`,
  };
}

function createDraftPackage(packageId: string, box: BoxCatalogEntry): DraftPackage {
  return {
    packageId,
    boxSku: box.boxSku,
    sfcBoxSku: box.sfcBoxSku,
    boxType: box.boxType,
    title: box.title,
    items: [],
    outerLengthMm: box.outerLengthMm,
    outerWidthMm: box.outerWidthMm,
    outerHeightMm: box.outerHeightMm,
    packagingCostCents: box.packagingCostCents,
    readyForDirectShipment: box.readyForDirectShipment,
    box,
  };
}

function packageLoad(draft: DraftPackage) {
  return {
    capacityUnits: draft.items.reduce((sum, item) => sum + item.quantity * item.capacityUnits, 0),
    weightGrams: draft.box.tareWeightGrams + draft.items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0),
  };
}

function draftCanTake(draft: DraftPackage, unit: ExpandedUnit) {
  const item = createItem(unit);
  const current = packageLoad(draft);
  const nextCapacity = current.capacityUnits + capacityUnits(unit.product);
  const maxCapacity = draft.box.maxAccessoryCapacityUnits ?? Number.MAX_SAFE_INTEGER;
  const nextWeight = current.weightGrams + item.weightGrams;

  return nextCapacity <= maxCapacity && nextWeight <= draft.box.maxWeightGrams;
}

function findBoxForUnit(
  unit: ExpandedUnit,
  boxes: BoxCatalogEntry[],
  issues: PackagePlanIssue[],
  boxType?: BoxCatalogEntry["boxType"],
) {
  if (unit.product.preferredBoxSku) {
    const preferred = boxes.find((box) => box.boxSku === unit.product.preferredBoxSku);
    if (preferred) return preferred;

    issue(issues, {
      code: "missing_preferred_box_sku",
      severity: "blocker",
      title: "Preferred box SKU missing",
      detail: `${unit.product.sku} points to ${unit.product.preferredBoxSku}, but that box is absent from the Box Catalog.`,
      sku: unit.product.sku,
      boxSku: unit.product.preferredBoxSku,
    });
    return undefined;
  }

  const group = bundleGroup(unit.product);
  return boxes
    .filter((box) => (boxType ? box.boxType === boxType : true))
    .filter((box) => !box.allowedBundleGroups || box.allowedBundleGroups.includes(group))
    .filter((box) => box.maxWeightGrams >= positiveOrZero(unit.product.weightGrams) + box.tareWeightGrams)
    .filter((box) => (box.maxAccessoryCapacityUnits ?? Number.MAX_SAFE_INTEGER) >= capacityUnits(unit.product))
    .sort(bySmallestUsableBox)[0];
}

function addUnitToDraft(draft: DraftPackage, unit: ExpandedUnit) {
  aggregateItem(draft.items, createItem(unit));
}

function expandPhysicalUnits(input: PackagePlanInput, issues: PackagePlanIssue[]) {
  const productBySku = new Map(input.products.map((product) => [product.sku, product]));
  const units: ExpandedUnit[] = [];
  let skippedBuiltInQuantity = 0;

  for (const line of input.lines) {
    const product = productBySku.get(line.sku);
    if (!product) {
      issue(issues, {
        code: "missing_product_master_sku",
        severity: "blocker",
        title: "Product Master SKU missing",
        detail: `${line.sku} is present on the order but absent from the PM Product Master snapshot.`,
        sku: line.sku,
      });
      continue;
    }

    const isBuiltin = line.isBuiltinMainBoxItem || line.lineRole === "builtin" || product.isBuiltinMainBoxItem;
    if (isBuiltin) {
      skippedBuiltInQuantity += line.quantity;
      continue;
    }

    recordProductDataIssues(product, issues);

    for (let index = 0; index < line.quantity; index += 1) {
      units.push({ line, product });
    }
  }

  return { units, productBySku, skippedBuiltInQuantity };
}

function planAccessoryGroup(
  groupUnits: ExpandedUnit[],
  boxes: BoxCatalogEntry[],
  issues: PackagePlanIssue[],
  nextPackageId: () => string,
) {
  const planned: DraftPackage[] = [];
  const firstUnit = groupUnits[0];
  if (!firstUnit) return planned;

  const group = bundleGroup(firstUnit.product);
  const candidateBoxes = boxes
    .filter((box) => box.boxType === "accessory_bundle" || box.boxType === "custom")
    .filter((box) => !box.allowedBundleGroups || box.allowedBundleGroups.includes(group))
    .sort(bySmallestUsableBox);

  if (candidateBoxes.length === 0) {
    for (const unit of groupUnits) {
      issue(issues, {
        code: "no_box_for_bundle_group",
        severity: "blocker",
        title: "No box for accessory bundle group",
        detail: `No Box Catalog entry accepts bundle group ${group} for ${unit.product.sku}.`,
        sku: unit.product.sku,
      });
    }
    return planned;
  }

  let current = createDraftPackage(nextPackageId(), candidateBoxes[0]);

  for (const unit of groupUnits) {
    if (!draftCanTake(current, unit)) {
      if (current.items.length > 0) {
        planned.push(current);
      }

      const nextBox = candidateBoxes.find((box) => draftCanTake(createDraftPackage("probe", box), unit));

      if (!nextBox) {
        issue(issues, {
          code: "unit_exceeds_available_boxes",
          severity: "blocker",
          title: "Accessory does not fit available boxes",
          detail: `${unit.product.sku} cannot fit any box for bundle group ${group}.`,
          sku: unit.product.sku,
        });
        continue;
      }

      current = createDraftPackage(nextPackageId(), nextBox);
    }

    addUnitToDraft(current, unit);
  }

  if (current.items.length > 0) {
    planned.push(current);
  }

  return planned;
}

export function buildPackagePlan(input: PackagePlanInput): PackagePlanResult {
  const issues: PackagePlanIssue[] = [];
  const boxes = [...input.boxes];
  const { units, productBySku } = expandPhysicalUnits(input, issues);
  let packageCounter = 0;
  const nextPackageId = () => `pkg-${String((packageCounter += 1)).padStart(3, "0")}`;
  const drafts: DraftPackage[] = [];
  const remaining: ExpandedUnit[] = [];

  const mainUnits = units.filter((unit) => (unit.product.productType ?? "accessory") === "main_box");
  const nonMainUnits = units.filter((unit) => (unit.product.productType ?? "accessory") !== "main_box");

  for (const unit of mainUnits) {
    const box = findBoxForUnit(unit, boxes, issues, "main");
    if (!box) continue;

    const draft = createDraftPackage(nextPackageId(), box);
    addUnitToDraft(draft, unit);
    drafts.push(draft);
  }

  for (const unit of nonMainUnits) {
    if (unit.product.requiresSeparateBox) {
      const box = findBoxForUnit(unit, boxes, issues, "separate");
      if (!box) continue;

      const draft = createDraftPackage(nextPackageId(), box);
      addUnitToDraft(draft, unit);
      drafts.push(draft);
      continue;
    }

    if (unit.product.canBundleWithMainBox) {
      const mainDraft = drafts.find((draft) => draft.boxType === "main" && draftCanTake(draft, unit));
      if (mainDraft) {
        addUnitToDraft(mainDraft, unit);
        continue;
      }
    }

    remaining.push(unit);
  }

  const accessoryGroups = new Map<string, ExpandedUnit[]>();
  for (const unit of remaining) {
    if (unit.product.canBundleWithAccessories === false) {
      const box = findBoxForUnit(unit, boxes, issues, "separate");
      if (!box) continue;

      const draft = createDraftPackage(nextPackageId(), box);
      addUnitToDraft(draft, unit);
      drafts.push(draft);
      continue;
    }

    const group = bundleGroup(unit.product);
    accessoryGroups.set(group, [...(accessoryGroups.get(group) ?? []), unit]);
  }

  for (const groupUnits of accessoryGroups.values()) {
    drafts.push(...planAccessoryGroup(groupUnits, boxes, issues, nextPackageId));
  }

  for (const draft of drafts) {
    if (!draft.readyForDirectShipment) {
      issue(issues, {
        code: "box_not_ready_for_direct_shipment",
        severity: "warning",
        title: "Box needs outer packing review",
        detail: `${draft.boxSku} is not marked ready_for_direct_shipment.`,
        boxSku: draft.boxSku,
      });
    }
  }

  const packageUnits = drafts.map((draft) => finishPackage(draft, productBySku, input.currency));
  const hasBlocker = issues.some((nextIssue) => nextIssue.severity === "blocker");
  const status: PackagePlanResult["status"] = hasBlocker ? "blocked" : issues.length > 0 ? "needs_review" : "ready";
  const summary = {
    packageCount: packageUnits.length,
    itemQuantity: packageUnits.reduce((sum, unit) => sum + unit.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    totalWeightGrams: packageUnits.reduce((sum, unit) => sum + unit.totalWeightGrams, 0),
    packagingCostCents: packageUnits.reduce((sum, unit) => sum + unit.packagingCostCents, 0),
    declaredValueCents: packageUnits.reduce((sum, unit) => sum + unit.declaredValueCents, 0),
    currency: input.currency,
  };
  const resultWithoutFingerprint = {
    orderId: input.orderId,
    sourceOrderKey: input.sourceOrderKey,
    catalogVersion: input.catalogVersion,
    packagePlanVersion: input.packagePlanVersion,
    destinationCountryCode: normalizeCountryCode(input.destinationCountryCode),
    status,
    packageUnits,
    issues,
    summary,
    externalActions: "none" as const,
  };

  return {
    ...resultWithoutFingerprint,
    fingerprint: createPackagePlanFingerprint(resultWithoutFingerprint),
  };
}

export function summarizePackagePlan(result: PackagePlanResult) {
  return {
    status: result.status,
    packageCount: result.summary.packageCount,
    totalWeightGrams: result.summary.totalWeightGrams,
    packagingCostCents: result.summary.packagingCostCents,
    blockerCount: result.issues.filter((nextIssue) => nextIssue.severity === "blocker").length,
    warningCount: result.issues.filter((nextIssue) => nextIssue.severity === "warning").length,
    externalActions: result.externalActions,
  };
}
