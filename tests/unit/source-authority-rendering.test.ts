import type { AdvisorBookResponse } from "@/features/advisor-book/contracts";
import { buildAdvisorBookWorkspaceModel } from "@/features/advisor-book/view-model";
import { buildRiskMandateComparisonViewModel } from "@/apps/performance/risk-mandate-comparison-view-model";

import { assertExactSourceRenderProof } from "../../scripts/live/validation/source-render-proof.mjs";
import { SOURCE_AUTHORITY_CONTRACTS } from "../../scripts/quality/source-authority-contracts.mjs";
import {
  buildConcentrationMandateComparisonFixture,
  buildSummaryMandateComparisonFixture,
} from "../fixtures/risk-mandate-comparison-fixtures";

function sourceContract(id: string) {
  const contract = SOURCE_AUTHORITY_CONTRACTS.find((candidate) => candidate.id === id);
  if (!contract) {
    throw new Error(`Source-authority contract ${id} is not enrolled.`);
  }
  return contract;
}

function advisorBookResponse(status: "ACTIVE" | "CLOSED"): AdvisorBookResponse {
  return {
    correlation_id: "source-authority-proof",
    contract_version: "v1",
    scope: {
      kind: "own_book",
      label: "My book",
      as_of_date: "2026-02-24",
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
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "Singapore",
        mandate_type: "DISCRETIONARY",
        status,
        opened_on: "2024-01-01",
        closed_on: status === "CLOSED" ? "2026-02-24" : null,
        membership_source: "PortfolioManagerBookMembership:v1",
        membership_reference: "portfolio:PB_SG_GLOBAL_BAL_001",
        membership_basis: "governed_role_assignment",
      },
    ],
    supportability: {
      state: "ready",
      reason_code: "advisor_book_ready",
      tenant_scope: "source_confirmed",
      limitations: [],
    },
    provenance: null,
  };
}

function advisorBookRenderedRows(response: AdvisorBookResponse) {
  return buildAdvisorBookWorkspaceModel(response).rows.map((row) => ({
    source: "advisor-book",
    identity: row.portfolioId,
    state: row.sourceLifecycleState,
  }));
}

function riskPayload(state: "breach" | "measure_unavailable") {
  const summary = buildSummaryMandateComparisonFixture();
  const concentration = buildConcentrationMandateComparisonFixture();
  const target = concentration.constraints.find(
    (constraint) => constraint.key === "issuer_max_weight",
  );
  if (!target) {
    throw new Error("Risk source-authority fixture has no issuer constraint.");
  }
  target.state = state;
  return { summary, concentration };
}

function riskRenderedRows(payload: ReturnType<typeof riskPayload>) {
  return buildRiskMandateComparisonViewModel({
    portfolioRisk: payload.summary,
    concentrationRisk: payload.concentration,
  }).sources.flatMap((source) =>
    source.constraints.map((constraint) => ({
      source: source.key,
      identity: constraint.key,
      state: constraint.state,
    })),
  );
}

describe("source-authority production mapping", () => {
  it.each(["CLOSED", "ACTIVE"] as const)(
    "preserves Advisor Book lifecycle state %s through the production view model",
    (status) => {
      const response = advisorBookResponse(status);
      expect(
        assertExactSourceRenderProof({
          screen: "Advisor Book",
          expectedRows: sourceContract("advisor-book-portfolios").buildExpectedRows(response),
          renderedRows: advisorBookRenderedRows(response),
        }),
      ).toHaveLength(1);
    },
  );

  it.each(["breach", "measure_unavailable"] as const)(
    "preserves Risk constraint state %s through the production view model",
    (state) => {
      const payload = riskPayload(state);
      expect(
        assertExactSourceRenderProof({
          screen: "Risk review",
          expectedRows: sourceContract("risk-mandate-comparison").buildExpectedRows(payload),
          renderedRows: riskRenderedRows(payload),
        }),
      ).toHaveLength(4);
    },
  );
});
