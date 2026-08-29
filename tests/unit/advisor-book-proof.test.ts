import { beforeAll } from "vitest";

const PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";
const AS_OF_DATE = "2026-04-10";
const PROOF_MODULE_PATH: string =
  "../../scripts/live/validation/advisor-book-proof.mjs";

type ValidateCanonicalAdvisorBookEvidence = (
  advisorBook: unknown,
  portfolioId: string,
  expectedAsOfDate: string,
) => Record<string, unknown>;

type ClassifyCanonicalAdvisorBookPanelSupportState = (
  evidence: Record<string, unknown>,
) => "partial";

type BuildAdvisorBookSourceRenderRows = (advisorBook: unknown) => Array<{
  source: string;
  identity: string;
  state: string;
}>;

type Membership = {
  portfolio_id: string;
  status: string;
  membership_source: string;
  membership_reference: string;
  membership_basis: string;
};

type AdvisorBookPayload = {
  scope: { kind: string; as_of_date: string };
  page: {
    total_count: number;
    offset: number;
    limit: number;
    returned_count: number;
  };
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
let classifyCanonicalAdvisorBookPanelSupportState: ClassifyCanonicalAdvisorBookPanelSupportState;
let buildAdvisorBookSourceRenderRows: BuildAdvisorBookSourceRenderRows;

function advisorBook(overrides: Partial<AdvisorBookPayload> = {}): AdvisorBookPayload {
  return {
    scope: { kind: "own_book", as_of_date: AS_OF_DATE },
    page: { total_count: 2, offset: 0, limit: 100, returned_count: 2 },
    items: [
      {
        portfolio_id: "PB_OTHER",
        status: "CLOSED",
        membership_source: "PortfolioManagerBookMembership:v1",
        membership_reference: "assignment:other",
        membership_basis: "legacy_advisor_projection",
      },
      {
        portfolio_id: PORTFOLIO_ID,
        status: "ACTIVE",
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
      classifyCanonicalAdvisorBookPanelSupportState: ClassifyCanonicalAdvisorBookPanelSupportState;
      buildAdvisorBookSourceRenderRows: BuildAdvisorBookSourceRenderRows;
    };
    validateCanonicalAdvisorBookEvidence = proofModule.validateCanonicalAdvisorBookEvidence;
    classifyCanonicalAdvisorBookPanelSupportState =
      proofModule.classifyCanonicalAdvisorBookPanelSupportState;
    buildAdvisorBookSourceRenderRows = proofModule.buildAdvisorBookSourceRenderRows;
  });

  it("adapts exact Gateway portfolio identities and lifecycle states for render proof", () => {
    expect(buildAdvisorBookSourceRenderRows(advisorBook())).toEqual([
      { source: "advisor-book", identity: "PB_OTHER", state: "CLOSED" },
      { source: "advisor-book", identity: PORTFOLIO_ID, state: "ACTIVE" },
    ]);
  });

  it("rejects malformed render-proof source rows with their source position", () => {
    const malformed = advisorBook();
    malformed.items[1].status = "";

    expect(() => buildAdvisorBookSourceRenderRows(malformed)).toThrow(
      "no portfolio lifecycle state for row 2",
    );
    expect(() => buildAdvisorBookSourceRenderRows({})).toThrow(
      "returned no portfolio memberships",
    );
  });

  it("selects the canonical item and records authoritative machine-readable evidence", () => {
    expect(
      validateCanonicalAdvisorBookEvidence(advisorBook(), PORTFOLIO_ID, AS_OF_DATE),
    ).toEqual(
      expect.objectContaining({
        proof: "AUTHORITATIVE_ADVISOR_BOOK_MEMBERSHIP_CONFIRMED",
        portfolioId: PORTFOLIO_ID,
        asOfDate: AS_OF_DATE,
        membershipBasis: "governed_role_assignment",
        membershipSource: "PortfolioManagerBookMembership:v1",
        totalCount: 2,
        returnedCount: 2,
        supportabilityState: "ready",
        tenantScope: "source_confirmed",
        tenantIdentityFollowUp: null,
        sourceTable: "portfolio_party_role_assignments",
        sourceField: "role_type",
      }),
    );
  });

  it("keeps the panel partial when source-confirmed membership is ready", () => {
    const evidence = validateCanonicalAdvisorBookEvidence(
      advisorBook(),
      PORTFOLIO_ID,
      AS_OF_DATE,
    );

    expect(classifyCanonicalAdvisorBookPanelSupportState(evidence)).toBe("partial");
    expect(() => classifyCanonicalAdvisorBookPanelSupportState({})).toThrow(
      /requires authoritative membership evidence/,
    );
  });

  it("rejects missing or mismatched canonical as-of scope", () => {
    const missing = advisorBook();
    missing.scope.as_of_date = "";
    expect(() =>
      validateCanonicalAdvisorBookEvidence(missing, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/no scope as-of date/);

    const mismatched = advisorBook();
    mismatched.scope.as_of_date = "2026-04-09";
    expect(() =>
      validateCanonicalAdvisorBookEvidence(mismatched, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/did not match requested canonical date/);
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
      AS_OF_DATE,
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

    expect(() =>
      validateCanonicalAdvisorBookEvidence(payload, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/did not prove a governed role assignment/);
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
        AS_OF_DATE,
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
        AS_OF_DATE,
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
        AS_OF_DATE,
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
        AS_OF_DATE,
      ),
    ).toThrow(/did not preserve ready reason/);

    const malformed = advisorBook();
    malformed.supportability.limitations = ["delegated_scope_not_supported", ""];
    expect(() =>
      validateCanonicalAdvisorBookEvidence(malformed, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/malformed supportability limitations/);

    const duplicate = advisorBook();
    duplicate.supportability.limitations = [
      "delegated_scope_not_supported",
      "delegated_scope_not_supported",
    ];
    expect(() =>
      validateCanonicalAdvisorBookEvidence(duplicate, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/duplicate supportability limitations/);
  });

  it("rejects missing, stale, or legacy-table provenance", () => {
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        advisorBook({ provenance: null }),
        PORTFOLIO_ID,
        AS_OF_DATE,
      ),
    ).toThrow(/no source provenance/);

    const stale = advisorBook();
    stale.provenance!.source_evidence_current = false;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(stale, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/source evidence was not current/);

    const legacyLineage = advisorBook();
    legacyLineage.provenance!.lineage.source_table = "portfolios";
    legacyLineage.provenance!.lineage.source_field = "advisor_id";
    expect(() =>
      validateCanonicalAdvisorBookEvidence(legacyLineage, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/did not prove authoritative portfolio role assignment ownership/);
  });

  it("rejects missing and duplicate canonical memberships", () => {
    const missing = advisorBook({ items: [] });
    missing.page.total_count = 0;
    missing.page.returned_count = 0;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(
        missing,
        PORTFOLIO_ID,
        AS_OF_DATE,
      ),
    ).toThrow(/returned 0 memberships/);

    const duplicate = advisorBook();
    duplicate.items.push({ ...duplicate.items[1] });
    duplicate.page.total_count = 3;
    duplicate.page.returned_count = 3;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(duplicate, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/returned 2 memberships/);
  });

  it("fails closed unless paging proves complete own-book coverage", () => {
    const incomplete = advisorBook();
    incomplete.page.total_count = 101;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(incomplete, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/did not cover the complete own-book result set/);

    const laterPage = advisorBook();
    laterPage.page.offset = 100;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(laterPage, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/did not cover the complete own-book result set/);

    const inconsistent = advisorBook();
    inconsistent.page.returned_count = 1;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(inconsistent, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/returned_count did not match/);

    const missingPage = advisorBook();
    delete (missingPage as { page?: AdvisorBookPayload["page"] }).page;
    expect(() =>
      validateCanonicalAdvisorBookEvidence(missingPage, PORTFOLIO_ID, AS_OF_DATE),
    ).toThrow(/malformed paging metadata/);
  });
});
