import { existsSync, readFileSync } from "node:fs";

export const SFC_CERTIFICATE_REVIEW_EVIDENCE_PATH = "docs/evidence/SFC_CERTIFICATE_REVIEW_2026-05-15.json";

export type SfcCertificateReviewEvidence = {
  provider?: string;
  checkedAt?: string;
  status?: "pending_owner_confirmation" | "approved";
  approval?: {
    ownerApproved?: boolean;
    certificateSourceReviewed?: boolean;
    credentialsRotated?: boolean;
    approvedAt?: string | null;
    reviewer?: string;
  };
  scope?: {
    redacted?: boolean;
    rawCredentialValuesStored?: boolean;
    rawSoapStored?: boolean;
    rawPiiStored?: boolean;
    serviceKeysStored?: boolean;
  };
  currentEnvDoctor?: {
    readinessCode?: string;
    smokePlanCode?: string;
    credentialsPresent?: boolean;
    certificateFlagConfirmed?: boolean;
    safeToRunReadOnlyApi?: boolean;
  };
  mutationBoundary?: {
    externalActions?: string;
    sfcEnableMutations?: boolean;
    mutatingActions?: string[];
  };
  requiredBeforePass?: string[];
};

export function loadSfcCertificateReviewEvidence(path = SFC_CERTIFICATE_REVIEW_EVIDENCE_PATH): SfcCertificateReviewEvidence | null {
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as SfcCertificateReviewEvidence;
  } catch {
    return null;
  }
}

export function sfcCertificateReviewRedacted(evidence: SfcCertificateReviewEvidence | null) {
  return Boolean(
    evidence?.provider === "sendfromchina" &&
      evidence.scope?.redacted === true &&
      evidence.scope.rawCredentialValuesStored === false &&
      evidence.scope.rawSoapStored === false &&
      evidence.scope.rawPiiStored === false &&
      evidence.scope.serviceKeysStored === false &&
      evidence.mutationBoundary?.externalActions === "none" &&
      evidence.mutationBoundary?.sfcEnableMutations === false &&
      Array.isArray(evidence.mutationBoundary?.mutatingActions) &&
      evidence.mutationBoundary?.mutatingActions.length === 0,
  );
}

export function sfcCertificateReviewApproved(evidence: SfcCertificateReviewEvidence | null) {
  return Boolean(
    sfcCertificateReviewRedacted(evidence) &&
      evidence?.status === "approved" &&
      evidence.approval?.ownerApproved === true &&
      evidence.approval?.certificateSourceReviewed === true &&
      (evidence.approval?.credentialsRotated === true || evidence.approval?.certificateSourceReviewed === true) &&
      typeof evidence.approval?.approvedAt === "string" &&
      evidence.approval?.approvedAt.length > 0,
  );
}
