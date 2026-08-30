import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, vi } from "vitest";

import type { AdvisorBookResponse } from "@/features/advisor-book/contracts";
import AdvisorBookWorkspace from "@/features/advisor-book/components/advisor-book-workspace";
import { buildRiskMandateComparisonViewModel } from "@/apps/performance/risk-mandate-comparison-view-model";
import RiskMandateComparison from "@/apps/performance/components/risk/risk-mandate-comparison";

import { assertExactSourceRenderProof } from "../../scripts/live/validation/source-render-proof.mjs";
import { SOURCE_AUTHORITY_CONTRACTS } from "../../scripts/quality/source-authority-contracts.mjs";
import { SOURCE_AUTHORITY_RENDER_PROOF_IDS } from "../../scripts/quality/source-authority-render-proof-registry.mjs";
import {
  buildConcentrationMandateComparisonFixture,
  buildSummaryMandateComparisonFixture,
} from "../fixtures/risk-mandate-comparison-fixtures";

const getAdvisorBookMock = vi.fn();

vi.mock("@/features/advisor-book/api", async () => {
  const actual = await vi.importActual<typeof import("@/features/advisor-book/api")>(
    "@/features/advisor-book/api",
  );
  return {
    ...actual,
    getAdvisorBook: (...args: unknown[]) => getAdvisorBookMock(...args),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/book",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("asOfDate=2026-02-24"),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

function sourceContract(id: string) {
  const contract = SOURCE_AUTHORITY_CONTRACTS.find((candidate) => candidate.id === id);
  if (!contract) {
    throw new Error(`Source-authority contract ${id} is not enrolled.`);
  }
  return contract;
}

const ADVISOR_BOOK_RENDER_CASES = [
  {
    identity: "PB_SG_SOURCE_AUTH_CLOSED",
    state: "CLOSED",
  },
  {
    identity: "PB_SG_SOURCE_AUTH_ACTIVE",
    state: "ACTIVE",
  },
] as const;

const RISK_RENDER_CASES = [
  {
    identity: "issuer_max_weight",
    state: "breach",
  },
  {
    identity: "issuer_group_max_weight",
    state: "measure_unavailable",
  },
] as const;

const RENDER_PROOF_CASES_BY_CONTRACT = {
  "advisor-book-portfolios": ADVISOR_BOOK_RENDER_CASES,
  "risk-mandate-comparison": RISK_RENDER_CASES,
} as const;

function advisorBookResponse(
  portfolioId: string,
  status: "ACTIVE" | "CLOSED",
): AdvisorBookResponse {
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
        portfolio_id: portfolioId,
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "Singapore",
        mandate_type: "DISCRETIONARY",
        status,
        opened_on: "2024-01-01",
        closed_on: status === "CLOSED" ? "2026-02-24" : null,
        membership_source: "PortfolioManagerBookMembership:v1",
        membership_reference: `portfolio:${portfolioId}`,
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

function advisorBookRenderedRows() {
  return [...document.querySelectorAll('[data-advisor-book-row="portfolio"]')].map(
    (row) => ({
      source: "advisor-book",
      identity: row.getAttribute("data-portfolio-id") ?? "",
      state: row.getAttribute("data-lifecycle-state") ?? "",
    }),
  );
}

function riskPayload(
  identity: string,
  state: "breach" | "measure_unavailable",
) {
  const summary = buildSummaryMandateComparisonFixture();
  const concentration = buildConcentrationMandateComparisonFixture();
  const target = concentration.constraints.find(
    (constraint) => constraint.key === "issuer_max_weight",
  );
  if (!target) {
    throw new Error("Risk source-authority fixture has no issuer constraint.");
  }
  target.key = identity;
  target.state = state;
  return { summary, concentration };
}

function riskRenderedRows(payload: ReturnType<typeof riskPayload>) {
  render(
    createElement(RiskMandateComparison, {
      comparison: buildRiskMandateComparisonViewModel({
        portfolioRisk: payload.summary,
        concentrationRisk: payload.concentration,
      }),
    }),
  );
  return [...document.querySelectorAll("[data-mandate-constraint]")].map((row) => ({
    source: row.getAttribute("data-mandate-constraint-source") ?? "",
    identity: row.getAttribute("data-mandate-constraint") ?? "",
    state: row.getAttribute("data-mandate-state") ?? "",
  }));
}

describe("source-authority production mapping", () => {
  beforeEach(() => {
    getAdvisorBookMock.mockReset();
  });

  it("registers identity-and-state render cases for every enrolled contract", () => {
    const contractIds = SOURCE_AUTHORITY_CONTRACTS.map((contract) => contract.id).sort();
    const proofIds = [...SOURCE_AUTHORITY_RENDER_PROOF_IDS].sort();
    const exercisedIds = Object.keys(RENDER_PROOF_CASES_BY_CONTRACT).sort();

    expect(proofIds).toEqual(contractIds);
    expect(exercisedIds).toEqual(contractIds);
    for (const cases of Object.values(RENDER_PROOF_CASES_BY_CONTRACT)) {
      expect(new Set(cases.map((entry) => entry.identity)).size).toBeGreaterThan(1);
      expect(new Set(cases.map((entry) => entry.state)).size).toBeGreaterThan(1);
    }
  });

  it.each(ADVISOR_BOOK_RENDER_CASES)(
    "preserves Advisor Book identity $identity and lifecycle state $state through the rendered workspace",
    async ({ identity, state }) => {
      const response = advisorBookResponse(identity, state);
      getAdvisorBookMock.mockResolvedValue(response);
      render(createElement(AdvisorBookWorkspace));
      await screen.findByRole("table", { name: "Portfolios in my book" });
      expect(
        assertExactSourceRenderProof({
          screen: "Advisor Book",
          expectedRows: sourceContract("advisor-book-portfolios").buildExpectedRows(response),
          renderedRows: advisorBookRenderedRows(),
        }),
      ).toHaveLength(1);
    },
  );

  it.each(RISK_RENDER_CASES)(
    "preserves Risk identity $identity and constraint state $state through the rendered comparison",
    ({ identity, state }) => {
      const payload = riskPayload(identity, state);
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
