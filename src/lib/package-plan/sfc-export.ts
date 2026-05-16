import { createHash } from "node:crypto";

import type { PackagePlanResult, PackagePlanUnit } from "./types";

export type SfcPackingInstructionRow = {
  sourceOrderKey: string;
  referenceNo: string;
  packagePlanFingerprint: string;
  packageId: string;
  parcelNo: number;
  parcelCount: number;
  boxSku: string;
  sfcBoxSku: string;
  dimensionsCm: string;
  totalWeightKg: string;
  declaredValueCents: number;
  itemSummary: string;
  packingInstruction: string;
};

export type SfcPackingInstructionExport = {
  provider: "sendfromchina";
  purpose: "packing_instruction_export";
  referenceNo: string;
  sourceOrderKey: string;
  packagePlanFingerprint: string;
  packagePlanVersion: string;
  catalogVersion: string;
  parcelCount: number;
  rows: SfcPackingInstructionRow[];
  orderNote: string;
  csv: string;
  mutation: false;
  containsBackerPii: false;
  externalActions: "none";
};

const SFC_PACKING_COLUMNS = [
  "sourceOrderKey",
  "referenceNo",
  "packagePlanFingerprint",
  "packageId",
  "parcelNo",
  "parcelCount",
  "boxSku",
  "sfcBoxSku",
  "dimensionsCm",
  "totalWeightKg",
  "declaredValueCents",
  "itemSummary",
  "packingInstruction",
] as const;

function csvValue(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function compactHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

export function createSfcReferenceNo(sourceOrderKey: string) {
  const normalized = sourceOrderKey
    .trim()
    .replace(/^pm:/, "pm-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length <= 32) return normalized || `odun-${compactHash(sourceOrderKey)}`;

  return `${normalized.slice(0, 23)}-${compactHash(sourceOrderKey)}`;
}

function formatDimensionsCm(unit: PackagePlanUnit) {
  return `${Math.round(unit.outerLengthMm / 10)}x${Math.round(unit.outerWidthMm / 10)}x${Math.round(unit.outerHeightMm / 10)}`;
}

function formatWeightKg(unit: PackagePlanUnit) {
  return (unit.totalWeightGrams / 1000).toFixed(3);
}

function itemSummary(unit: PackagePlanUnit) {
  return unit.items.map((item) => `${item.sku} x${item.quantity}`).join("; ");
}

function exportCsv(rows: SfcPackingInstructionRow[]) {
  const header = SFC_PACKING_COLUMNS.join(",");
  const body = rows.map((row) => SFC_PACKING_COLUMNS.map((column) => csvValue(row[column])).join(","));
  return [header, ...body].join("\n");
}

export function createSfcPackingInstructionExport(plan: PackagePlanResult): SfcPackingInstructionExport {
  const referenceNo = createSfcReferenceNo(plan.sourceOrderKey);
  const parcelCount = plan.packageUnits.length;
  const rows = plan.packageUnits.map((unit, index) => ({
    sourceOrderKey: plan.sourceOrderKey,
    referenceNo,
    packagePlanFingerprint: plan.fingerprint,
    packageId: unit.packageId,
    parcelNo: index + 1,
    parcelCount,
    boxSku: unit.boxSku,
    sfcBoxSku: unit.sfcBoxSku ?? unit.boxSku,
    dimensionsCm: formatDimensionsCm(unit),
    totalWeightKg: formatWeightKg(unit),
    declaredValueCents: unit.declaredValueCents,
    itemSummary: itemSummary(unit),
    packingInstruction: unit.packingInstruction,
  }));
  const orderNote = [
    `ODUN_PACKAGE_PLAN ref=${referenceNo}`,
    `catalog=${plan.catalogVersion}`,
    `rules=${plan.packagePlanVersion}`,
    `fingerprint=${plan.fingerprint.slice(0, 16)}`,
    `parcels=${parcelCount}`,
    ...rows.map((row) => `${row.packageId}: ${row.packingInstruction}`),
    "SFC: please match shipping channel, show estimated shipping cost, then final-measure parcels before shipping and provide tracking.",
  ].join(" | ");

  return {
    provider: "sendfromchina",
    purpose: "packing_instruction_export",
    referenceNo,
    sourceOrderKey: plan.sourceOrderKey,
    packagePlanFingerprint: plan.fingerprint,
    packagePlanVersion: plan.packagePlanVersion,
    catalogVersion: plan.catalogVersion,
    parcelCount,
    rows,
    orderNote,
    csv: exportCsv(rows),
    mutation: false,
    containsBackerPii: false,
    externalActions: "none",
  };
}
