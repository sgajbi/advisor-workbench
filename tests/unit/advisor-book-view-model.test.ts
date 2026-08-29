import { describe, expect, it } from "vitest";

import type { AdvisorBookResponse } from "@/features/advisor-book/contracts";
import {
  buildAdvisorBookResultScopeModel,
  buildAdvisorBookWorkspaceModel,
} from "@/features/advisor-book/view-model";

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
        expect.objectContaining({ label: "Matching portfolios", value: "2" }),
        expect.objectContaining({ label: "Portfolios shown", value: "2" }),
        expect.objectContaining({ label: "Clients shown", value: "1" }),
        expect.objectContaining({ label: "Assignment basis", value: "1 legacy" }),
      ]),
    );
    expect(model.rows[0]).toEqual(
      expect.objectContaining({
        portfolioLabel: "PB_001",
        portfolioReferenceLabel: "Portfolio reference",
        clientReference: "CIF_001",
        mandateLabel: "Discretionary mandate",
        sourceLifecycleState: "ACTIVE",
        membershipLabel: "Legacy advisor assignment",
      }),
    );
    expect(model.rows[1]).toEqual(
      expect.objectContaining({
        portfolioLabel: "Income mandate",
        portfolioReferenceLabel: "Portfolio reference PB_002",
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
          occurrenceCount: 1,
        }),
        expect.objectContaining({
          label: "Operating scope confirmation pending",
          occurrenceCount: 1,
        }),
      ]),
    );
    expect(model.supportDetails).toEqual(
      expect.arrayContaining([
        { label: "Membership record", value: "Portfolio manager assignments" },
        { label: "Operating scope", value: "Workbench access context only" },
        { label: "Availability reference", value: "advisor_book_tenant_scope_not_reported" },
        {
          label: "Limitation references",
          value: "delegated_scope_not_supported, tenant_scope_not_reported",
        },
      ]),
    );
    expect(JSON.stringify(model)).not.toMatch(
      /tenant scope|status code|membership v1|source-backed|source-confirmed|source currency|source limitation/i,
    );
  });

  it("consolidates repeated unknown limitations while retaining their support references", () => {
    const model = buildAdvisorBookWorkspaceModel({
      ...response,
      supportability: {
        ...response.supportability,
        limitations: ["unmapped_one", "unmapped_two", "unmapped_one"],
      },
    });

    expect(model.limitations).toEqual([
      expect.objectContaining({
        label: "Additional operating limitation",
        occurrenceCount: 3,
      }),
    ]);
    expect(model.supportDetails).toContainEqual({
      label: "Limitation references",
      value: "unmapped_one, unmapped_two",
    });
  });

  it("describes the source-returned order when it matches the requested view", () => {
    const resultScope = buildAdvisorBookResultScopeModel(
      {
        clientId: "CIF_001",
        mandateType: "ADVISORY",
        sortBy: "client_id",
        sortOrder: "desc",
      },
      { ...response.page, sort_by: "client_id", sort_order: "desc" },
    );

    expect(resultScope).toEqual({
      rangeLabel: "1–2 of 2 portfolios",
      viewLabel:
        "Client reference CIF_001 · Advisory mandates · Displayed order: Client reference, descending",
    });
  });

  it("distinguishes the requested order when the source returns a different order", () => {
    const resultScope = buildAdvisorBookResultScopeModel(
      {
        sortBy: "client_id",
        sortOrder: "desc",
      },
      response.page,
    );

    expect(resultScope).toEqual({
      rangeLabel: "1–2 of 2 portfolios",
      viewLabel:
        "All clients · All supported mandates · Displayed order: Portfolio reference, ascending · Requested order: Client reference, descending",
    });
  });
});
