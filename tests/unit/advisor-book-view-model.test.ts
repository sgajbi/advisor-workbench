import { describe, expect, it } from "vitest";

import type { AdvisorBookResponse } from "@/features/advisor-book/contracts";
import { buildAdvisorBookWorkspaceModel } from "@/features/advisor-book/view-model";

const response: AdvisorBookResponse = {
  correlation_id: "corr-1",
  contract_version: "v1",
  scope: {
    kind: "own_book",
    label: "My book",
    as_of_date: "2026-04-10",
    booking_center_code: "Singapore",
  },
  page: {
    total_count: 2,
    offset: 0,
    limit: 25,
    returned_count: 2,
    sort_by: "portfolio_id",
    sort_order: "asc",
  },
  items: [
    {
      portfolio_id: "PB_001",
      display_name: "PB_001",
      client_id: "CIF_001",
      base_currency: "USD",
      booking_center_code: "Singapore",
      mandate_type: "DISCRETIONARY",
      status: "ACTIVE",
      opened_on: "2025-03-31",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_001",
      membership_basis: "legacy_advisor_projection",
    },
    {
      portfolio_id: "PB_002",
      display_name: "Income mandate",
      client_id: "CIF_001",
      base_currency: "SGD",
      booking_center_code: "Singapore",
      mandate_type: "ADVISORY",
      status: "ACTIVE",
      opened_on: "2025-04-01",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_002",
      membership_basis: "governed_role_assignment",
    },
  ],
  supportability: {
    state: "degraded",
    reason_code: "advisor_book_tenant_scope_not_reported",
    tenant_scope: "trusted_context_only",
    limitations: ["tenant_scope_not_reported", "delegated_scope_not_supported"],
  },
  provenance: null,
};

describe("advisor-book workspace view model", () => {
  it("uses business labels without inventing AUM, attention, household, or team scope", () => {
    const model = buildAdvisorBookWorkspaceModel(response);

    expect(model.title).toBe("My book");
    expect(model.stateLabel).toBe("Available with limitations");
    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Portfolios", value: "2" }),
        expect.objectContaining({ label: "Clients on this page", value: "1" }),
        expect.objectContaining({ label: "Role assignment coverage", value: "1 legacy" }),
      ]),
    );
    expect(model.rows[0]).toEqual(
      expect.objectContaining({
        portfolioLabel: "Portfolio PB_001",
        clientLabel: "Client CIF_001",
        mandateLabel: "Discretionary mandate",
        membershipLabel: "Legacy advisor assignment",
      }),
    );
    expect(JSON.stringify(model)).not.toMatch(/AUM|household|team book|attention rank/i);
  });

  it("translates operating boundaries while retaining raw evidence in support details", () => {
    const model = buildAdvisorBookWorkspaceModel(response);

    expect(model.limitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Own book only",
          rawValue: "delegated_scope_not_supported",
        }),
        expect.objectContaining({
          label: "Operating scope confirmation pending",
          rawValue: "tenant_scope_not_reported",
        }),
      ]),
    );
    expect(model.supportDetails).toEqual(
      expect.arrayContaining([
        { label: "Membership record", value: "Portfolio manager assignments" },
        { label: "Operating scope", value: "Workbench access context only" },
        { label: "Availability reference", value: "advisor_book_tenant_scope_not_reported" },
      ]),
    );
    expect(JSON.stringify(model)).not.toMatch(/tenant scope|status code|membership v1/i);
  });
});
