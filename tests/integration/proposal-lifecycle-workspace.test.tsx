import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalLifecycleWorkspace from "../../src/features/proposals/components/proposal-lifecycle-workspace";
import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "../../src/features/proposals/components/proposal-workflow-context";
import { buildNeutralProposalWorkflowContext } from "../../src/features/proposals/proposal-workflow-context-view-model";

const proposalListFixture = {
  items: [
    {
      proposal_id: "PRP-RISK",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "RISK_REVIEW",
      title: "Technology concentration trim",
    },
    {
      proposal_id: "PRP-READY",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "EXECUTION_READY",
      title: "Execution handoff",
    },
  ],
};
const policyReviewQueueFixture = {
  items: [
    {
      evaluation_id: "pev_001",
      proposal_id: "PRP-RISK",
      proposal_version_id: "ppv_001",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.05",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
      disclosure_requirements: ["advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"],
      source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
    },
  ],
};
const listProposalsMock = vi.fn(async (_filters?: unknown) => proposalListFixture);
const getAdvisoryPolicyReviewQueueMock = vi.fn(
  async (_filters?: { evaluationStatus?: string; portfolioId?: string }) =>
    policyReviewQueueFixture
);
const getAdvisoryPolicyEvaluationMock = vi.fn(async (_evaluationId: string) => ({
  ...policyReviewQueueFixture.items[0],
  evaluation_hash: "sha256:policy-evaluation-1",
  source_refs: ["lotus-core:core_product_eligibility_target_market_complexity"],
  evaluation_json: {
    rule_results: [
      { rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW", status: "PENDING_REVIEW" },
      { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
    ],
  },
}));
const getAdvisoryPolicySignOffPackageMock = vi.fn(async (_evaluationId: string) => ({
  package_posture: {
    sign_off_source_package: "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
    client_ready_publication: "BLOCKED",
  },
  lineage: {
    audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
    lineage_posture: { client_ready_publication: "BLOCKED" },
  },
}));
const getAdvisoryPolicyWorkflowMock = vi.fn(async (_evaluationId: string) => ({
  sign_off_status: "PENDING_REVIEW",
  sign_off_blockers: [
    "DISCLOSURE_REQUIREMENT_OPEN:advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
  ],
  maker_checker_required: true,
  sla_posture: { status: "WITHIN_SLA", open_requirement_count: 2 },
  client_ready_publication: "BLOCKED",
}));
const recordAdvisoryPolicySignOffDecisionMock = vi.fn(
  async (_evaluationId: string, _payload: unknown, _idempotencyKey?: string) => ({
    workflow: {
      sign_off_status: "PENDING_REVIEW",
      client_ready_publication: "BLOCKED",
    },
  })
);

vi.mock("../../src/features/proposals/api", () => ({
  getAdvisoryPolicyEvaluation: (evaluationId: string) =>
    getAdvisoryPolicyEvaluationMock(evaluationId),
  getAdvisoryPolicyReviewQueue: (filters: {
    evaluationStatus?: string;
    portfolioId?: string;
  }) => getAdvisoryPolicyReviewQueueMock(filters),
  getAdvisoryPolicySignOffPackage: (evaluationId: string) =>
    getAdvisoryPolicySignOffPackageMock(evaluationId),
  getAdvisoryPolicyWorkflow: (evaluationId: string) =>
    getAdvisoryPolicyWorkflowMock(evaluationId),
  listProposals: (filters: unknown) => listProposalsMock(filters),
  recordAdvisoryPolicySignOffDecision: (
    evaluationId: string,
    payload: unknown,
    idempotencyKey?: string
  ) => recordAdvisoryPolicySignOffDecisionMock(evaluationId, payload, idempotencyKey),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ProposalLifecycleWorkspace", () => {
  beforeEach(() => {
    listProposalsMock.mockReset();
    listProposalsMock.mockImplementation(async (_filters?: unknown) => proposalListFixture);
    getAdvisoryPolicyReviewQueueMock.mockReset();
    getAdvisoryPolicyReviewQueueMock.mockImplementation(
      async (_filters?: { evaluationStatus?: string; portfolioId?: string }) =>
        policyReviewQueueFixture
    );
    getAdvisoryPolicyEvaluationMock.mockReset();
    getAdvisoryPolicyEvaluationMock.mockImplementation(async (_evaluationId: string) => ({
      ...policyReviewQueueFixture.items[0],
      evaluation_hash: "sha256:policy-evaluation-1",
      source_refs: ["lotus-core:core_product_eligibility_target_market_complexity"],
      evaluation_json: {
        rule_results: [
          { rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW", status: "PENDING_REVIEW" },
          { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
        ],
      },
    }));
    getAdvisoryPolicySignOffPackageMock.mockReset();
    getAdvisoryPolicySignOffPackageMock.mockImplementation(async (_evaluationId: string) => ({
      package_posture: {
        sign_off_source_package: "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
        client_ready_publication: "BLOCKED",
      },
      lineage: {
        audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
        lineage_posture: { client_ready_publication: "BLOCKED" },
      },
    }));
    getAdvisoryPolicyWorkflowMock.mockReset();
    getAdvisoryPolicyWorkflowMock.mockImplementation(async (_evaluationId: string) => ({
      sign_off_status: "PENDING_REVIEW",
      sign_off_blockers: [
        "DISCLOSURE_REQUIREMENT_OPEN:advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
      ],
      maker_checker_required: true,
      sla_posture: { status: "WITHIN_SLA", open_requirement_count: 2 },
      client_ready_publication: "BLOCKED",
    }));
    recordAdvisoryPolicySignOffDecisionMock.mockReset();
    recordAdvisoryPolicySignOffDecisionMock.mockImplementation(
      async (_evaluationId: string, _payload: unknown, _idempotencyKey?: string) => ({
        workflow: {
          sign_off_status: "PENDING_REVIEW",
          client_ready_publication: "BLOCKED",
        },
      })
    );
  });

  it("renders a focused risk and impact screen from proposal lifecycle data", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="risk-impact" />
    );

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });

    expect(await screen.findByRole("heading", { level: 2, name: "Risk And Impact" })).toBeInTheDocument();
    expect(screen.getByText("Technology concentration trim")).toBeInTheDocument();
    expect(screen.queryByText("Execution handoff")).not.toBeInTheDocument();
    expect(screen.getByText("Risk officer approval needed")).toBeInTheDocument();
    expect(screen.getByLabelText("Proposal lifecycle counts")).toHaveTextContent(/1\s*In view/);
  });

  it("publishes the Gateway-backed queue summary to the shared workflow rail", async () => {
    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="approval-queue" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByRole("heading", { name: "1 need attention" })).toBeInTheDocument();
    expect(screen.getByText("2 proposals in view")).toBeInTheDocument();
    expect(screen.getByText("1 proposal needs advisor action.")).toBeInTheDocument();
    expect(screen.getByText("Gateway · advisory proposal lifecycle")).toBeInTheDocument();
    expect(screen.queryByText(/kyc validity verified/i)).not.toBeInTheDocument();
  });

  it("does not show fallback rows when lifecycle data is unavailable", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="approval-queue" />
    );

    expect(
      await screen.findByText("Proposal lifecycle is unavailable. No fallback proposal queue is shown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal lifecycle unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Technology concentration trim")).not.toBeInTheDocument();
  });

  it("renders Gateway-backed suitability policy evaluations without raw policy payload language", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    await waitFor(() => {
      expect(getAdvisoryPolicyReviewQueueMock).toHaveBeenCalledWith({
        evaluationStatus: "PENDING_REVIEW",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_001");
      expect(getAdvisoryPolicySignOffPackageMock).toHaveBeenCalledWith("pev_001");
      expect(getAdvisoryPolicyWorkflowMock).toHaveBeenCalledWith("pev_001");
    });

    expect(await screen.findByRole("heading", { level: 3, name: "Policy evaluations needing review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Sign-off source package and source evidence" })).toBeInTheDocument();
    expect(screen.getAllByText("Review required")).toHaveLength(3);
    expect(screen.getByText("Sign-off pending")).toBeInTheDocument();
    expect(screen.getByText("1 approval dependency, 1 disclosure review")).toBeInTheDocument();
    expect(screen.getAllByText("Complete required approval review.")).toHaveLength(2);
    expect(screen.getByText("Source package available")).toBeInTheDocument();
    expect(screen.getByText("Client publication blocked")).toBeInTheDocument();
    expect(screen.getByText("Independent checker required")).toBeInTheDocument();
    expect(screen.getByText("Within review SLA, 2 open")).toBeInTheDocument();
    expect(screen.getByText("Request more evidence")).toBeInTheDocument();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(screen.queryByText("advisor_reviewed_disclosure:SG_STRUCTURED_NOTE")).not.toBeInTheDocument();
    expect(screen.queryByText("advisory-policy-evaluations")).not.toBeInTheDocument();
    expect(screen.queryByText("SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API")).not.toBeInTheDocument();
    expect(screen.queryByText("DISCLOSURE_REQUIREMENT_OPEN")).not.toBeInTheDocument();
  });

  it("records bounded policy evidence review requests through Gateway only", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Request more evidence" }));

    await waitFor(() => {
      expect(recordAdvisoryPolicySignOffDecisionMock).toHaveBeenCalledWith(
        "pev_001",
        expect.objectContaining({
          body: expect.objectContaining({
            actor_id: "advisor_1",
            decision: "REQUEST_MORE_EVIDENCE",
            source_evaluation_hash: "sha256:policy-evaluation-1",
          }),
        }),
        expect.stringMatching(/^ui-policy-review-request-pev_001-\d+$/)
      );
    });

    expect(
      await screen.findByText(
        "Evidence review request recorded through the advisory policy workflow."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("APPROVE_FOR_POLICY_SIGN_OFF")).not.toBeInTheDocument();
  });

  it("does not show fallback policy evaluations when the suitability queue is unavailable", async () => {
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    expect(await screen.findByText("Policy review queue is unavailable. No fallback suitability policy queue is shown.")).toBeInTheDocument();
    expect(screen.getByText("Policy review queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
  });
});
