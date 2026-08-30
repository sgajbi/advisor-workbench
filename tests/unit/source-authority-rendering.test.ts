import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, vi } from "vitest";

import type { AdvisorBookResponse } from "@/features/advisor-book/contracts";
import AdvisorBookWorkspace from "@/features/advisor-book/components/advisor-book-workspace";
import { buildRiskMandateComparisonViewModel } from "@/apps/performance/risk-mandate-comparison-view-model";
import RiskMandateComparison from "@/apps/performance/components/risk/risk-mandate-comparison";

import { assertExactSourceRenderProof } from "../../scripts/live/validation/source-render-proof.mjs";
import {
  SOURCE_AUTHORITY_CONTRACTS,
  type SourceAuthorityContract,
} from "../../scripts/quality/source-authority-contracts.mjs";
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

type RenderProofCase = Readonly<{
  identity: string;
  state: string;
}>;

type ExecutableRenderProof = Readonly<{
  contractId: string;
  cases: readonly RenderProofCase[];
  renderCase(testCase: RenderProofCase): Promise<unknown>;
}>;

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

function extractDeclaredRenderedRows(contract: SourceAuthorityContract) {
  const evidence = contract.renderedEvidence;
  return [...document.querySelectorAll(evidence.rowSelector)].map((row) => ({
    source: row.getAttribute(evidence.sourceAttribute) ?? "",
    identity: row.getAttribute(evidence.identityAttribute) ?? "",
    state: row.getAttribute(evidence.stateAttribute) ?? "",
  }));
}

async function renderAdvisorBookCase({ identity, state }: RenderProofCase) {
  if (state !== "ACTIVE" && state !== "CLOSED") {
    throw new Error(`Unsupported Advisor Book proof state ${state}.`);
  }
  const response = advisorBookResponse(identity, state);
  getAdvisorBookMock.mockResolvedValue(response);
  render(createElement(AdvisorBookWorkspace));
  await screen.findByRole("table", { name: "Portfolios in my book" });
  return response;
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

function renderRiskMandateComparison(payload: ReturnType<typeof riskPayload>) {
  render(
    createElement(RiskMandateComparison, {
      comparison: buildRiskMandateComparisonViewModel({
        portfolioRisk: payload.summary,
        concentrationRisk: payload.concentration,
      }),
    }),
  );
}

async function renderRiskCase({ identity, state }: RenderProofCase) {
  if (state !== "breach" && state !== "measure_unavailable") {
    throw new Error(`Unsupported Risk proof state ${state}.`);
  }
  const payload = riskPayload(identity, state);
  renderRiskMandateComparison(payload);
  return payload;
}

const EXECUTABLE_RENDER_PROOFS = [
  {
    contractId: "advisor-book-portfolios",
    cases: ADVISOR_BOOK_RENDER_CASES,
    renderCase: renderAdvisorBookCase,
  },
  {
    contractId: "risk-mandate-comparison",
    cases: RISK_RENDER_CASES,
    renderCase: renderRiskCase,
  },
] as const satisfies readonly ExecutableRenderProof[];

describe("source-authority production mapping", () => {
  beforeEach(() => {
    getAdvisorBookMock.mockReset();
  });

  it("registers identity-and-state render cases for every enrolled contract", () => {
    const contractIds = SOURCE_AUTHORITY_CONTRACTS.map((contract) => contract.id).sort();
    const proofIds = [...SOURCE_AUTHORITY_RENDER_PROOF_IDS].sort();
    const executableIds = EXECUTABLE_RENDER_PROOFS.map((proof) => proof.contractId).sort();

    expect(proofIds).toEqual(contractIds);
    expect(executableIds).toEqual(contractIds);
    for (const proof of EXECUTABLE_RENDER_PROOFS) {
      expect(new Set(proof.cases.map((entry) => entry.identity)).size).toBeGreaterThan(1);
      expect(new Set(proof.cases.map((entry) => entry.state)).size).toBeGreaterThan(1);
    }
  });

  for (const proof of EXECUTABLE_RENDER_PROOFS) {
    const testCases: RenderProofCase[] = [...proof.cases];
    it.each(testCases)(
      `preserves ${proof.contractId} source identity $identity and state $state through its rendered component`,
      async (testCase: RenderProofCase) => {
        const contract = sourceContract(proof.contractId);
        const sourcePayload = await proof.renderCase(testCase);
        const expectedRows = contract.buildExpectedRows(sourcePayload);
        expect(
          assertExactSourceRenderProof({
            screen: contract.screen,
            expectedRows,
            renderedRows: extractDeclaredRenderedRows(contract),
          }),
        ).toHaveLength(expectedRows.length);
      },
    );
  }
});
