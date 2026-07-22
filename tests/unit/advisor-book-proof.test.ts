import { beforeAll } from "vitest";

const PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";
const PROOF_MODULE_PATH: string =
  "../../scripts/live/validation/advisor-book-proof.mjs";

type ValidateCanonicalAdvisorBookEvidence = (
  advisorBook: unknown,
  portfolioId: string,
) => Record<string, unknown>;

type Membership = {
  portfolio_id: string;
  membership_source: string;
  membership_reference: string;
  membership_basis: string;
};

type AdvisorBookPayload = {
  scope: { kind: string };
  items: Membership[];
  supportability: {
    state: string;
    reason_code: string;
    tenant_scope: string;
    limitations: string[];
  };
  provenance: {
    product_name: string;
    product_version: string;
    latest_evidence_timestamp: string;
    freshness_status: string;
    data_quality_status: string;
    source_evidence_current: boolean;
    snapshot_id: string;
    content_hash: string;
    lineage: {
      source_system: string;
      source_table: string;
      source_field: string;
    };
  } | null;
};

let validateCanonicalAdvisorBookEvidence: ValidateCanonicalAdvisorBookEvidence;

function advisorBook(overrides: Partial<AdvisorBookPayload> = {}): AdvisorBookPayload {
  return {
    scope: { kind: "own_book" },
    items: [
      {
        portfolio_id: "PB_OTHER",
        membership_source: "PortfolioManagerBookMembership:v1",
        membership_reference: "assignment:other",
        membership_basis: "legacy_advisor_projection",
      },
      {
        portfolio_id: PORTFOLIO_ID,
        membership_source: "PortfolioManagerBookMembership:v1",
        membership_reference: "assignment:canonical",
        membership_basis: "governed_role_assignment",
      },
    ],
    supportability: {
      state: "ready",
      reason_code: "advisor_book_ready",
      tenant_scope: "source_confirmed",
      limitations: ["delegated_scope_not_supported"],
    },
    provenance: {
      product_name: "PortfolioManagerBookMembership",
      product_version: "v1",
      latest_evidence_timestamp: "2026-04-10T01:59:00Z",
      freshness_status: "CURRENT",
      data_quality_status: "ACCEPTED",
      source_evidence_current: true,
      snapshot_id: "pm_book_membership:canonical",
      content_hash: "sha256:canonical",
      lineage: {
        source_system: "lotus-core",
        source_table: "portfolio_party_role_assignments",
        source_field: "role_type",
      },
    },
    ...overrides,
  };
}

describe("authoritative advisor-book live proof", () => {
  beforeAll(async () => {
    const proofModule = (await import(PROOF_MODULE_PATH)) as {
      validateCanonicalAdvisorBookEvidence: ValidateCanonicalAdvisorBookEvidence;
    };
    validateCanonicalAdvisorBookEvidence = proofModule.validateCanonicalAdvisorBookEvidence;
  });

  it("selects the canonical item and records authoritative machine-readable evidence", () => {
    expect(validateCanonicalAdvisorBookEvidence(advisorBook(), PORTFOLIO_ID)).toEqual(
      expect.objectContaining({
        proof: "AUTHORITATIVE_ADVISOR_BOOK_MEMBERSHIP_CONFIRMED",
        portfolioId: PORTFOLIO_ID,
        membershipBasis: "governed_role_assignment",
        membershipSource: "PortfolioManagerBookMembership:v1",
        supportabilityState: "ready",
        tenantScope: "source_confirmed",
        tenantIdentityFollowUp: null,
        sourceTable: "portfolio_party_role_assignments",
        sourceField: "role_type",
      }),
    );
  });

  it("keeps the separate tenant-identity limitation explicit without masking assignment proof", () => {
    const evidence = validateCanonicalAdvisorBookEvidence(
      advisorBook({
        supportability: {
          state: "degraded",
          reason_code: "advisor_book_tenant_scope_not_reported",
          tenant_scope: "trusted_context_only",
          limitations: ["tenant_scope_not_reported", "delegated_scope_not_supported"],
        },
      }),
      PORTFOLIO_ID,
    );

    expect(evidence).toEqual(
      expect.objectContaining({
        membershipBasis: "governed_role_assignment",
        supportabilityState: "degraded",
        tenantScope: "trusted_context_only",
        tenantIdentityFollowUp: "lotus-core#798",
      }),
    );
  });

  it("rejects legacy canonical membership even when another item is authoritative", () => {
    const payload = advisorBook();
    payload.items[1].membership_basis = "legacy_advisor_projection";

    expect(() => validateCanonicalAdvisorBookEvidence(payload, PORTFOLIO_ID)).toThrow(
      /did not prove a governed role assignment/,
    );
  });

  it("rejects legacy limitations and non-tenant-only degraded postures", () => {
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({
          supportability: {
            state: "degraded",
            reason_code: "advisor_book_legacy_projection",
            tenant_scope: "source_confirmed",
            limitations: ["legacy_advisor_projection_present"],
          },
        }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/legacy advisor projection limitation/);

    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({
          supportability: {
            state: "degraded",
            reason_code: "advisor_book_tenant_scope_not_reported",
            tenant_scope: "trusted_context_only",
            limitations: ["tenant_scope_not_reported", "source_membership_incomplete"],
          },
        }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/not limited to the governed tenant-source-confirmation gap/);

    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({
          supportability: {
            state: "degraded",
            reason_code: "advisor_book_tenant_scope_not_reported",
            tenant_scope: "trusted_context_only",
            limitations: ["tenant_scope_not_reported", "calculation_evidence_missing"],
          },
        }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/not limited to the governed tenant-source-confirmation gap/);
  });

  it("rejects malformed or contradictory supportability limitations", () => {
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({
          supportability: {
            state: "ready",
            reason_code: "advisor_book_ready",
            tenant_scope: "source_confirmed",
            limitations: ["tenant_scope_not_reported"],
          },
        }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/did not preserve ready reason/);

    const malformed = advisorBook();
    malformed.supportability.limitations = ["delegated_scope_not_supported", ""];
    expect(() => validateCanonicalAdvisorBookEvidence(malformed, PORTFOLIO_ID)).toThrow(
      /malformed supportability limitations/,
    );

    const duplicate = advisorBook();
    duplicate.supportability.limitations = [
      "delegated_scope_not_supported",
      "delegated_scope_not_supported",
    ];
    expect(() => validateCanonicalAdvisorBookEvidence(duplicate, PORTFOLIO_ID)).toThrow(
      /duplicate supportability limitations/,
    );
  });

  it("rejects missing, stale, or legacy-table provenance", () => {
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({ provenance: null }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/no source provenance/);

    const stale = advisorBook();
    stale.provenance!.source_evidence_current = false;
    expect(() => validateCanonicalAdvisorBookEvidence(stale, PORTFOLIO_ID)).toThrow(
      /source evidence was not current/,
    );

    const legacyLineage = advisorBook();
    legacyLineage.provenance!.lineage.source_table = "portfolios";
    legacyLineage.provenance!.lineage.source_field = "advisor_id";
    expect(() => validateCanonicalAdvisorBookEvidence(legacyLineage, PORTFOLIO_ID)).toThrow(
      /did not prove authoritative portfolio role assignment ownership/,
    );
  });

  it("rejects missing and duplicate canonical memberships", () => {
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({ items: [] }),
        PORTFOLIO_ID,
      ),
    ).toThrow(/returned 0 memberships/);

    const duplicate = advisorBook();
    duplicate.items.push({ ...duplicate.items[1] });
    expect(() => validateCanonicalAdvisorBookEvidence(duplicate, PORTFOLIO_ID)).toThrow(
      /returned 2 memberships/,
    );
  });
});
