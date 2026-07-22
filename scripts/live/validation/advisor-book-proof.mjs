import { readString } from "./payload-utils.mjs";

const EXPECTED_PRODUCT_NAME = "PortfolioManagerBookMembership";
const EXPECTED_PRODUCT_VERSION = "v1";
const EXPECTED_MEMBERSHIP_SOURCE = `${EXPECTED_PRODUCT_NAME}:${EXPECTED_PRODUCT_VERSION}`;
const LEGACY_LIMITATIONS = new Set([
  "legacy_advisor_projection",
  "legacy_advisor_projection_present",
]);

function requireString(value, field) {
  const normalized = readString(value);
  if (!normalized) {
    throw new Error(`Gateway advisor-book evidence returned no ${field}.`);
  }
  return normalized;
}

function assertSupportability(supportability) {
  const state = readString(supportability?.state);
  const reason = readString(supportability?.reason_code);
  const tenantScope = readString(supportability?.tenant_scope);
  const limitations = Array.isArray(supportability?.limitations)
    ? supportability.limitations.map((value) => readString(value)).filter(Boolean)
    : [];

  if (limitations.some((limitation) => LEGACY_LIMITATIONS.has(limitation))) {
    throw new Error(
      "Gateway advisor-book evidence retained a legacy advisor projection limitation.",
    );
  }
  if (state === "ready") {
    if (reason !== "advisor_book_ready" || tenantScope !== "source_confirmed") {
      throw new Error(
        "Gateway advisor-book ready evidence did not preserve ready reason and source-confirmed tenant scope.",
      );
    }
  } else if (state === "degraded") {
    const tenantOnly =
      reason === "advisor_book_tenant_scope_not_reported" &&
      tenantScope === "trusted_context_only" &&
      limitations.includes("tenant_scope_not_reported");
    if (!tenantOnly) {
      throw new Error(
        "Gateway advisor-book degraded evidence was not limited to the governed tenant-source-confirmation gap.",
      );
    }
  } else {
    throw new Error(
      `Gateway advisor-book evidence was not supportable for canonical proof: ${state ?? "missing"}.`,
    );
  }

  return { state, reason, tenantScope, limitations };
}

function assertProvenance(provenance) {
  if (!provenance || typeof provenance !== "object") {
    throw new Error("Gateway advisor-book evidence returned no source provenance.");
  }
  const productName = requireString(provenance.product_name, "provenance product name");
  const productVersion = requireString(
    provenance.product_version,
    "provenance product version",
  );
  if (productName !== EXPECTED_PRODUCT_NAME || productVersion !== EXPECTED_PRODUCT_VERSION) {
    throw new Error("Gateway advisor-book evidence returned unsupported product provenance.");
  }
  if (provenance.source_evidence_current !== true) {
    throw new Error("Gateway advisor-book source evidence was not current.");
  }
  const freshnessStatus = requireString(
    provenance.freshness_status,
    "provenance freshness status",
  );
  const dataQualityStatus = requireString(
    provenance.data_quality_status,
    "provenance data-quality status",
  );
  if (freshnessStatus !== "CURRENT" || dataQualityStatus !== "ACCEPTED") {
    throw new Error(
      "Gateway advisor-book evidence was not current and accepted by the source product.",
    );
  }
  const latestEvidenceTimestamp = requireString(
    provenance.latest_evidence_timestamp,
    "latest source evidence timestamp",
  );
  const snapshotId = requireString(provenance.snapshot_id, "source snapshot identity");
  const contentHash = requireString(provenance.content_hash, "source content hash");
  const lineage = provenance.lineage;
  if (!lineage || typeof lineage !== "object" || Array.isArray(lineage)) {
    throw new Error("Gateway advisor-book evidence returned no source lineage.");
  }
  const sourceTable = requireString(lineage.source_table, "lineage source table");
  const sourceField = requireString(lineage.source_field, "lineage source field");
  const sourceSystem = requireString(lineage.source_system, "lineage source system");
  if (
    sourceTable !== "portfolio_party_role_assignments" ||
    sourceField !== "role_type" ||
    sourceSystem !== "lotus-core"
  ) {
    throw new Error(
      "Gateway advisor-book lineage did not prove authoritative portfolio role assignment ownership.",
    );
  }

  return {
    productName,
    productVersion,
    sourceEvidenceCurrent: true,
    freshnessStatus,
    dataQualityStatus,
    latestEvidenceTimestamp,
    snapshotId,
    contentHash,
    sourceTable,
    sourceField,
    sourceSystem,
  };
}

export function validateCanonicalAdvisorBookEvidence(advisorBook, portfolioId) {
  if (readString(advisorBook?.scope?.kind) !== "own_book") {
    throw new Error("Gateway advisor-book response did not preserve own-book scope.");
  }
  const items = Array.isArray(advisorBook?.items) ? advisorBook.items : [];
  const canonicalItems = items.filter(
    (item) => readString(item?.portfolio_id) === portfolioId,
  );
  if (canonicalItems.length !== 1) {
    throw new Error(
      `Gateway advisor book returned ${canonicalItems.length} memberships for canonical portfolio ${portfolioId}; expected exactly one.`,
    );
  }
  const membership = canonicalItems[0];
  const membershipSource = requireString(
    membership.membership_source,
    "canonical membership source",
  );
  const membershipBasis = requireString(
    membership.membership_basis,
    "canonical membership basis",
  );
  requireString(membership.membership_reference, "canonical membership reference");
  if (membershipSource !== EXPECTED_MEMBERSHIP_SOURCE) {
    throw new Error("Gateway advisor book returned an unsupported canonical membership source.");
  }
  if (membershipBasis !== "governed_role_assignment") {
    throw new Error(
      "Gateway advisor book did not prove a governed role assignment for the canonical portfolio.",
    );
  }

  const supportability = assertSupportability(advisorBook.supportability);
  const provenance = assertProvenance(advisorBook.provenance);
  return {
    proof: "AUTHORITATIVE_ADVISOR_BOOK_MEMBERSHIP_CONFIRMED",
    portfolioId,
    scope: "own_book",
    membershipSource,
    membershipBasis,
    membershipReferencePresent: true,
    supportabilityState: supportability.state,
    supportabilityReason: supportability.reason,
    tenantScope: supportability.tenantScope,
    limitations: supportability.limitations,
    tenantIdentityFollowUp:
      supportability.tenantScope === "source_confirmed" ? null : "lotus-core#798",
    ...provenance,
  };
}
