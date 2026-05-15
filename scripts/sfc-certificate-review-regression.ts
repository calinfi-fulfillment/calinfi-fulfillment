import assert from "node:assert/strict";
import {
  loadSfcCertificateReviewEvidence,
  sfcCertificateReviewApproved,
  sfcCertificateReviewRedacted,
  SFC_CERTIFICATE_REVIEW_EVIDENCE_PATH,
} from "./sfc-certificate-review-evidence";

const evidence = loadSfcCertificateReviewEvidence();

assert.ok(evidence, `${SFC_CERTIFICATE_REVIEW_EVIDENCE_PATH} must exist.`);
assert.equal(evidence?.provider, "sendfromchina");
assert.ok(evidence?.status === "pending_owner_confirmation" || evidence?.status === "approved");
assert.equal(sfcCertificateReviewRedacted(evidence), true);

if (evidence?.status === "pending_owner_confirmation") {
  assert.equal(evidence.approval?.ownerApproved, false);
  assert.equal(evidence.approval.certificateSourceReviewed, false);
  assert.equal(evidence.approval.credentialsRotated, false);
  assert.equal(evidence.currentEnvDoctor?.safeToRunReadOnlyApi, false);
}

if (evidence?.status === "approved") {
  assert.equal(sfcCertificateReviewApproved(evidence), true);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "sfc-certificate-review",
      status: evidence?.status,
      approvedForPilotGate: sfcCertificateReviewApproved(evidence),
      externalActions: "none",
    },
    null,
    2,
  ),
);
