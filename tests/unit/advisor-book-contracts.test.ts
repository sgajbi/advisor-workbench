import { describe, expect, it } from "vitest";

import { parseAdvisorBookResponse } from "@/features/advisor-book/contracts";

const response = {
  correlation_id: "corr-advisor-book-001",
  contract_version: "v1",
  scope: {
    kind: "own_book",
    label: "My book",
    as_of_date: "2026-04-10",
    booking_center_code: "Singapore",
  },
  page: {
    total_count: 1,
    offset: 0,
    limit: 25,
    returned_count: 1,
    sort_by: "portfolio_id",
    sort_order: "asc",
  },
  items: [
    {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      display_name: "PB_SG_GLOBAL_BAL_001",
      client_id: "CIF_SG_GLOBAL_BAL_001",
      base_currency: "USD",
      booking_center_code: "Singapore",
      mandate_type: "DISCRETIONARY",
      status: "ACTIVE",
      opened_on: "2025-03-31",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_SG_GLOBAL_BAL_001",
      membership_basis: "legacy_advisor_projection",
    },
  ],
  supportability: {
    state: "degraded",
    reason_code: "advisor_book_tenant_scope_not_reported",
    tenant_scope: "trusted_context_only",
    limitations: ["tenant_scope_not_reported", "delegated_scope_not_supported"],
  },
  provenance: {
    product_name: "PortfolioManagerBookMembership",
    product_version: "v1",
    generated_at: "2026-04-10T02:00:00Z",
    latest_evidence_timestamp: "2026-04-10T01:59:00Z",
    freshness_status: "CURRENT",
    data_quality_status: "ACCEPTED",
    source_evidence_current: true,
    snapshot_id: "pm_book_membership:2e7dfe0c",
    content_hash: "sha256:0123456789abcdef",
    lineage: { source_owner: "lotus-core" },
  },
};

describe("advisor-book response contract", () => {
  it("accepts the exact Gateway v1 own-book contract", () => {
    expect(parseAdvisorBookResponse(response)).toEqual(response);
  });

  it("fails closed when membership source semantics drift", () => {
    expect(() =>
      parseAdvisorBookResponse({
        ...response,
        items: [{ ...response.items[0], membership_source: "browser-catalogue" }],
      }),
    ).toThrow();
  });

  it("fails closed when unsupported scope is advertised", () => {
    expect(() =>
      parseAdvisorBookResponse({
        ...response,
        scope: { ...response.scope, kind: "team_book", label: "Team book" },
      }),
    ).toThrow();
  });
});
