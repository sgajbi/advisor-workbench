import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalLifecycleWorkspace from "../../src/features/proposals/components/proposal-lifecycle-workspace";
import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "../../src/features/proposals/components/proposal-workflow-context";
import { buildNeutralProposalWorkflowContext } from "../../src/features/proposals/proposal-workflow-context-view-model";
import type {
  AdvisoryPolicyEvaluationData,
  AdvisoryPolicySignOffPackageData,
  AdvisoryPolicyWorkflowData,
} from "../../src/features/proposals/types";

const proposalListFixture = {
  items: [
    {
      proposal_id: "PRP-RISK",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "RISK_REVIEW",
      current_version_no: 3,
      created_at: "2026-08-19T09:30:00Z",
      title: "Technology concentration trim",
    },
    {
      proposal_id: "PRP-READY",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "EXECUTION_READY",
      current_version_no: 5,
      created_at: "2026-08-20T11:15:00Z",
      title: "Execution handoff",
    },
  ],
  next_cursor: null as string | null,
};
const policyReviewQueueFixture = {
  items: [
    {
      evaluation_id: "pev_001",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
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
const secondPolicyReviewFixture = {
  evaluation_id: "pev_002",
  portfolio_id: "PB_SG_GLOBAL_BAL_001",
  proposal_id: "PRP-INCOME",
  proposal_version_id: "ppv_002",
  policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
  policy_version: "2026.06",
  evaluation_status: "PENDING_REVIEW",
  approval_dependencies: [],
  disclosure_requirements: [],
  consent_requirements: ["client_consent:SG_INCOME_MANDATE"],
  source_gaps: [],
};
const listProposalsMock = vi.fn(async (_filters?: unknown) => proposalListFixture);
const getAdvisoryPolicyReviewQueueMock = vi.fn(
  async (_filters?: { evaluationStatus?: string; portfolioId?: string }) =>
    policyReviewQueueFixture
);
const getAdvisoryPolicyEvaluationMock = vi.fn(
  async (_evaluationId: string): Promise<AdvisoryPolicyEvaluationData> => ({
    ...policyReviewQueueFixture.items[0],
    evaluation_hash: "sha256:policy-evaluation-1",
    source_refs: ["lotus-core:core_product_eligibility_target_market_complexity"],
    evaluation_json: {
      rule_results: [
        { rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW", status: "PENDING_REVIEW" },
        { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
      ],
    },
  })
);
const getAdvisoryPolicySignOffPackageMock = vi.fn(
  async (_evaluationId: string): Promise<AdvisoryPolicySignOffPackageData> => ({
    package_posture: {
      sign_off_source_package: "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
      client_ready_publication: "BLOCKED",
    },
    lineage: {
      audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
      lineage_posture: { client_ready_publication: "BLOCKED" },
    },
  })
);
const policyWorkflowFixture: AdvisoryPolicyWorkflowData = {
  sign_off_status: "PENDING_REVIEW",
  sign_off_blockers: [
    "DISCLOSURE_REQUIREMENT_OPEN:advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
  ],
  maker_checker_required: true,
  sla_posture: { status: "WITHIN_SLA", open_requirement_count: 2 },
  client_ready_publication: "BLOCKED",
};
const getAdvisoryPolicyWorkflowMock = vi.fn(
  async (_evaluationId: string): Promise<AdvisoryPolicyWorkflowData> =>
    policyWorkflowFixture
);
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
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  };
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
    getAdvisoryPolicyWorkflowMock.mockImplementation(
      async (_evaluationId: string) => policyWorkflowFixture
    );
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
    expect(screen.getByText("Advisory proposal lifecycle")).toBeInTheDocument();
    expect(screen.queryByText(/kyc validity verified/i)).not.toBeInTheDocument();
  });

  it("keeps the selected proposal posture beside the keyboard-operable worklist", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="approval-queue" />
    );

    const worklist = await screen.findByRole("listbox", { name: "Approval Queue proposals" });
    const options = within(worklist).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveTextContent("Version 3");
    expect(options[0]).toHaveTextContent("19 Aug 2026");

    const selectedProposal = screen.getByRole("region", { name: "Selected proposal decision" });
    expect(within(selectedProposal).getByRole("heading", { name: "Technology concentration trim" })).toBeInTheDocument();
    expect(within(selectedProposal).getByText("Risk officer approval needed")).toBeInTheDocument();
    expect(within(selectedProposal).getByRole("link", { name: "Open proposal review" })).toHaveAttribute(
      "href",
      "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=approval-queue"
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(within(selectedProposal).getByRole("heading", { name: "Execution handoff" })).toBeInTheDocument();
    expect(within(selectedProposal).getByText("Ready for execution handoff")).toBeInTheDocument();
  });

  it("resets selected proposal identity when the source window changes", async () => {
    listProposalsMock
      .mockResolvedValueOnce({ ...proposalListFixture, next_cursor: "cursor-window-2" })
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "PRP-CONSENT",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "AWAITING_CLIENT_CONSENT",
            current_version_no: 2,
            created_at: "2026-08-21T08:15:00Z",
            title: "Consent evidence review",
          },
        ],
        next_cursor: null,
      });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="approval-queue" />
    );

    const worklist = await screen.findByRole("listbox", { name: "Approval Queue proposals" });
    const firstWindowOptions = within(worklist).getAllByRole("option");
    fireEvent.keyDown(firstWindowOptions[0], { key: "ArrowDown" });
    expect(firstWindowOptions[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next proposals" }));

    const nextWindowProposal = await screen.findByRole("option", {
      name: /Consent evidence review/,
    });
    expect(nextWindowProposal).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("option", { name: /Execution handoff/ })).not.toBeInTheDocument();
  });

  it("keeps suitability posture loading until the policy queue and selected evidence settle", async () => {
    let resolvePolicyQueue: ((value: typeof policyReviewQueueFixture) => void) | undefined;
    let resolvePolicyEvaluation:
      | ((value: Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockImplementationOnce(
      async () =>
        await new Promise<typeof policyReviewQueueFixture>((resolve) => {
          resolvePolicyQueue = resolve;
        })
    );
    getAdvisoryPolicyEvaluationMock.mockImplementationOnce(
      async () =>
        await new Promise<Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>>(
          (resolve) => {
            resolvePolicyEvaluation = resolve;
          }
        )
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByRole("heading", { name: "Loading proposal posture" })).toBeInTheDocument();

    await act(async () => {
      resolvePolicyQueue?.(policyReviewQueueFixture);
    });
    await waitFor(() => {
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_001");
    });
    expect(screen.getByRole("heading", { name: "Loading proposal posture" })).toBeInTheDocument();

    await act(async () => {
      resolvePolicyEvaluation?.({
        ...policyReviewQueueFixture.items[0],
        evaluation_hash: "sha256:policy-evaluation-1",
        source_refs: ["lotus-core:core_product_eligibility_target_market_complexity"],
        evaluation_json: { rule_results: [] },
      });
    });

    expect(
      await screen.findByRole("heading", { name: /need attention|queue ready for review/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Source current")).toBeInTheDocument();
  });

  it("keeps cached policy evidence visible while its source refreshes", async () => {
    let resolveWorkflowRefresh:
      | ((value: Awaited<ReturnType<typeof getAdvisoryPolicyWorkflowMock>>) => void)
      | undefined;

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByText("Request more evidence")).toBeInTheDocument();
    getAdvisoryPolicyWorkflowMock.mockImplementationOnce(
      async () =>
        await new Promise<Awaited<ReturnType<typeof getAdvisoryPolicyWorkflowMock>>>(
          (resolve) => {
            resolveWorkflowRefresh = resolve;
          }
        )
    );

    fireEvent.click(screen.getByRole("button", { name: "Request more evidence" }));

    expect(
      await screen.findByRole("heading", { name: "Refreshing proposal evidence" })
    ).toBeInTheDocument();
    expect(screen.getByText("Refreshing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "PRP-RISK · ppv_001",
      })
    ).toBeInTheDocument();

    await act(async () => {
      resolveWorkflowRefresh?.({
        sign_off_status: "PENDING_REVIEW",
        sign_off_blockers: [],
        maker_checker_required: true,
        sla_posture: { status: "WITHIN_SLA", open_requirement_count: 1 },
        client_ready_publication: "BLOCKED",
      });
    });

    expect(
      await screen.findByRole("heading", { name: /need attention|queue ready for review/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Source current")).toBeInTheDocument();
  });

  it("keeps cached policy evidence visible but marks a failed refresh partial", async () => {
    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByText("Request more evidence")).toBeInTheDocument();
    getAdvisoryPolicyWorkflowMock.mockRejectedValueOnce(new Error("refresh unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "Request more evidence" }));

    expect(
      await screen.findByRole("heading", { name: "Supporting evidence is incomplete" })
    ).toBeInTheDocument();
    expect(screen.getByText("The latest policy-evidence refresh did not complete.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The selected policy evidence could not be refreshed. The prior source package remains visible but is not confirmed current."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "PRP-RISK · ppv_001",
      })
    ).toBeInTheDocument();
  });

  it("does not confirm an empty cached policy queue after its refresh fails", async () => {
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({ items: [] });
    const { queryClient } = renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByText("No policy evaluations need review")).toBeInTheDocument();
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(new Error("policy refresh unavailable"));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["advisory-policy-review-queue", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(await screen.findByText("Policy review queue is unconfirmed")).toBeInTheDocument();
    expect(screen.getByText(/Retry before concluding that no evaluations need review/)).toBeInTheDocument();
    expect(screen.queryByText("No policy evaluations need review")).not.toBeInTheDocument();
  });

  it("keeps a failed proposal refresh distinct from supporting policy evidence", async () => {
    const { queryClient } = renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="approval-queue"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(
      await screen.findByRole("option", { name: /Technology concentration trim/ })
    ).toBeInTheDocument();
    listProposalsMock.mockRejectedValueOnce(new Error("proposal refresh unavailable"));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["proposal-lifecycle-workspace", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(
      await screen.findByRole("heading", { name: "Proposal view is incomplete" })
    ).toBeInTheDocument();
    expect(screen.getByText("The latest proposal view could not be confirmed.")).toBeInTheDocument();
    expect(screen.getByText(/Retry the proposal view before relying/)).toBeInTheDocument();
    expect(screen.queryByText("The latest policy-evidence refresh did not complete.")).not.toBeInTheDocument();
  });

  it("keeps policy evidence hidden when its source denies access", async () => {
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(
      new Error("Policy queue failed (403): {\"detail\":\"portfolio access denied\"}")
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Proposal posture is restricted" })
    ).toBeInTheDocument();
    expect(screen.getByText("Policy review access is not available")).toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
  });

  it("withholds review actions when selected policy sources disagree on identity", async () => {
    getAdvisoryPolicyWorkflowMock.mockResolvedValueOnce({
      evaluation_id: "pev_other",
      proposal_id: "PRP-RISK",
      proposal_version_id: "ppv_001",
      sign_off_status: "PENDING_REVIEW",
      maker_checker_required: true,
      client_ready_publication: "BLOCKED",
    });

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(
      await screen.findByText("Selected policy evidence is unconfirmed")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The selected proposal and its supporting policy evidence do not agree. No review request is available until the source package is refreshed."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request more evidence" })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Supporting evidence is incomplete" })
    ).toBeInTheDocument();
  });

  it("keeps a mismatched evaluation detail explicit and fail closed", async () => {
    getAdvisoryPolicyEvaluationMock.mockResolvedValueOnce({
      ...policyReviewQueueFixture.items[0],
      evaluation_id: "pev_other",
      evaluation_hash: "sha256:wrong-evaluation",
    });

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(
      await screen.findByText("Selected policy evidence is unconfirmed")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request more evidence" })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Supporting evidence is incomplete" })
    ).toBeInTheDocument();
  });

  it("withholds review actions when required queue and detail identity is missing", async () => {
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({
      items: [
        {
          ...policyReviewQueueFixture.items[0],
          proposal_version_id: undefined as unknown as string,
        },
      ],
    });
    getAdvisoryPolicyEvaluationMock.mockResolvedValueOnce({
      ...policyReviewQueueFixture.items[0],
      proposal_version_id: undefined,
      evaluation_hash: "sha256:policy-evaluation-1",
    });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    expect(
      await screen.findByText("Selected policy evidence is unconfirmed")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request more evidence" })).not.toBeInTheDocument();
    expect(recordAdvisoryPolicySignOffDecisionMock).not.toHaveBeenCalled();
  });

  it("validates detail identity against the selected queue record before enabling action", async () => {
    getAdvisoryPolicyEvaluationMock.mockResolvedValueOnce({
      ...policyReviewQueueFixture.items[0],
      proposal_id: "PRP-OTHER",
      proposal_version_id: "ppv_other",
      evaluation_hash: "sha256:wrong-proposal",
    });
    getAdvisoryPolicySignOffPackageMock.mockResolvedValueOnce({
      evaluation: {
        evaluation_id: "pev_001",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        proposal_id: "PRP-OTHER",
        proposal_version_id: "ppv_other",
      },
      lineage: { evaluation_id: "pev_001" },
    });
    getAdvisoryPolicyWorkflowMock.mockResolvedValueOnce({
      evaluation_id: "pev_001",
      proposal_id: "PRP-OTHER",
      proposal_version_id: "ppv_other",
      sign_off_status: "PENDING_REVIEW",
    });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    expect(
      await screen.findByText("Selected policy evidence is unconfirmed")
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /PRP-RISK/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByRole("button", { name: "Request more evidence" })).not.toBeInTheDocument();
    expect(recordAdvisoryPolicySignOffDecisionMock).not.toHaveBeenCalled();
  });

  it("navigates bounded proposal source windows without claiming queue completeness", async () => {
    listProposalsMock
      .mockResolvedValueOnce({ items: [], next_cursor: "cursor-window-2" })
      .mockResolvedValueOnce({
        items: [proposalListFixture.items[0]],
        next_cursor: null,
      });

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

    expect(
      await screen.findByRole("heading", { name: "More proposals available" })
    ).toBeInTheDocument();
    expect(screen.getByText("0 proposals in current view")).toBeInTheDocument();
    expect(screen.getByText("No matching proposals in this view")).toBeInTheDocument();
    expect(screen.queryByText("No proposals in the approval queue")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next proposals" }));

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenLastCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: "cursor-window-2",
      });
    });
    expect(
      await screen.findByRole("option", { name: /Technology concentration trim/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1 proposal needs attention in this view" })
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal view 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous proposals" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next proposals" })).toBeDisabled();
  });

  it("allows return to the prior proposal window after a later window fails", async () => {
    listProposalsMock
      .mockResolvedValueOnce({ items: [], next_cursor: "cursor-window-2" })
      .mockRejectedValueOnce(new Error("gateway unavailable"));

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

    fireEvent.click(await screen.findByRole("button", { name: "Next proposals" }));
    expect(
      await screen.findByRole("heading", { name: "Proposal posture is unavailable" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous proposals" }));

    expect(
      await screen.findByRole("heading", { name: "More proposals available" })
    ).toBeInTheDocument();
  });

  it("publishes restricted posture for proposal API authorization responses with response detail", async () => {
    listProposalsMock.mockRejectedValueOnce(
      new Error("Proposal list failed (403): {\"detail\":\"portfolio access denied\"}")
    );

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

    expect(
      await screen.findByRole("heading", { name: "Proposal posture is restricted" })
    ).toBeInTheDocument();
    expect(screen.getByText("Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Proposal posture is unavailable")).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 4, name: "PRP-RISK · ppv_001" })).toBeInTheDocument();
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

  it("keeps evidence and actions bound to the explicitly selected review", async () => {
    let resolveFirstEvaluation:
      | ((value: Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({
      items: [...policyReviewQueueFixture.items, secondPolicyReviewFixture],
    });
    getAdvisoryPolicyEvaluationMock.mockImplementation(async (evaluationId: string) => {
      if (evaluationId === "pev_001") {
        return await new Promise<Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>>(
          (resolve) => {
            resolveFirstEvaluation = resolve;
          }
        );
      }
      return {
        ...secondPolicyReviewFixture,
        evaluation_hash: "sha256:policy-evaluation-2",
        source_refs: ["lotus-core:client_mandate_income_objective"],
        evaluation_json: { rule_results: [{ rule_id: "INCOME_OBJECTIVE", status: "READY" }] },
      };
    });
    getAdvisoryPolicySignOffPackageMock.mockImplementation(async (evaluationId: string) => ({
      package_posture: {
        sign_off_source_package: "AVAILABLE",
        client_ready_publication: "BLOCKED",
      },
      lineage: {
        evaluation_id: evaluationId,
        audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
        lineage_posture: { client_ready_publication: "BLOCKED" },
      },
    }));
    getAdvisoryPolicyWorkflowMock.mockImplementation(async (evaluationId: string) => ({
      evaluation_id: evaluationId,
      sign_off_status: "PENDING_REVIEW",
      sign_off_blockers: evaluationId === "pev_002" ? ["CLIENT_CONSENT_REQUIRED"] : [],
      maker_checker_required: true,
      sla_posture: { status: "WITHIN_SLA", open_requirement_count: 1 },
      client_ready_publication: "BLOCKED",
    }));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    const firstReview = await screen.findByRole("option", { name: /PRP-RISK/i });
    const secondReview = screen.getByRole("option", { name: /PRP-INCOME/i });
    expect(firstReview).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(firstReview, { key: "ArrowDown" });

    await waitFor(() => {
      expect(secondReview).toHaveAttribute("aria-selected", "true");
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_002");
      expect(getAdvisoryPolicySignOffPackageMock).toHaveBeenCalledWith("pev_002");
      expect(getAdvisoryPolicyWorkflowMock).toHaveBeenCalledWith("pev_002");
    });
    const selectedReview = screen.getByRole("region", { name: "Selected suitability review" });
    expect(
      await within(selectedReview).findByRole("heading", { name: "PRP-INCOME · ppv_002" })
    ).toBeInTheDocument();
    expect(within(selectedReview).getByText("Source evidence complete")).toBeInTheDocument();

    await act(async () => {
      resolveFirstEvaluation?.({
        ...policyReviewQueueFixture.items[0],
        evaluation_hash: "sha256:policy-evaluation-1",
        source_refs: ["lotus-core:late_first_record"],
        source_gaps: ["late_first_record_gap"],
        evaluation_json: { rule_results: [] },
      });
    });
    expect(
      within(selectedReview).getByRole("heading", { name: "PRP-INCOME · ppv_002" })
    ).toBeInTheDocument();
    expect(within(selectedReview).queryByText("1 evidence gap")).not.toBeInTheDocument();

    fireEvent.click(within(selectedReview).getByRole("button", { name: "Request more evidence" }));
    await waitFor(() => {
      expect(recordAdvisoryPolicySignOffDecisionMock).toHaveBeenCalledWith(
        "pev_002",
        expect.objectContaining({
          body: expect.objectContaining({
            decision: "REQUEST_MORE_EVIDENCE",
            source_evaluation_hash: "sha256:policy-evaluation-2",
          }),
        }),
        expect.stringMatching(/^ui-policy-review-request-pev_002-\d+$/)
      );
    });
  });

  it("keeps the automatically selected review stable when the queue reorders", async () => {
    getAdvisoryPolicyReviewQueueMock
      .mockResolvedValueOnce({
        items: [...policyReviewQueueFixture.items, secondPolicyReviewFixture],
      })
      .mockResolvedValueOnce({
        items: [secondPolicyReviewFixture, ...policyReviewQueueFixture.items],
      });
    getAdvisoryPolicyEvaluationMock.mockImplementation(async (evaluationId: string) => {
      const record =
        evaluationId === "pev_002" ? secondPolicyReviewFixture : policyReviewQueueFixture.items[0];
      return {
        ...record,
        evaluation_hash: `sha256:policy-evaluation-${evaluationId}`,
      };
    });

    const { queryClient } = renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    const firstReview = await screen.findByRole("option", { name: /PRP-RISK/i });
    expect(firstReview).toHaveAttribute("aria-selected", "true");

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["advisory-policy-review-queue", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(screen.getByRole("option", { name: /PRP-RISK/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: /PRP-INCOME/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(getAdvisoryPolicyEvaluationMock).not.toHaveBeenCalledWith("pev_002");
  });

  it("does not publish a completed request against a newly selected review", async () => {
    let resolveFirstRequest:
      | ((value: Awaited<ReturnType<typeof recordAdvisoryPolicySignOffDecisionMock>>) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({
      items: [...policyReviewQueueFixture.items, secondPolicyReviewFixture],
    });
    getAdvisoryPolicyEvaluationMock.mockImplementation(async (evaluationId: string) => {
      const record =
        evaluationId === "pev_002" ? secondPolicyReviewFixture : policyReviewQueueFixture.items[0];
      return {
        ...record,
        evaluation_hash: `sha256:policy-evaluation-${evaluationId === "pev_002" ? "2" : "1"}`,
        source_refs: ["lotus-core:governed_policy_source"],
        evaluation_json: {
          rule_results: [{ rule_id: "MANDATE_ALIGNMENT", status: "READY" }],
        },
      };
    });
    recordAdvisoryPolicySignOffDecisionMock.mockImplementationOnce(
      async () =>
        await new Promise<
          Awaited<ReturnType<typeof recordAdvisoryPolicySignOffDecisionMock>>
        >((resolve) => {
          resolveFirstRequest = resolve;
        })
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Request more evidence" }));
    expect(await screen.findByRole("button", { name: "Recording request..." })).toBeDisabled();

    fireEvent.click(screen.getByRole("option", { name: /PRP-INCOME/i }));
    const selectedReview = screen.getByRole("region", { name: "Selected suitability review" });
    expect(
      await within(selectedReview).findByRole("heading", { name: "PRP-INCOME · ppv_002" })
    ).toBeInTheDocument();

    await act(async () => {
      resolveFirstRequest?.({
        workflow: {
          sign_off_status: "PENDING_REVIEW",
          client_ready_publication: "BLOCKED",
        },
      });
    });

    expect(
      within(selectedReview).queryByText(
        "Evidence review request recorded through the advisory policy workflow."
      )
    ).not.toBeInTheDocument();
    expect(
      within(selectedReview).getByText(
        "Records a review request only; it does not approve sign-off or client publication."
      )
    ).toBeInTheDocument();
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
