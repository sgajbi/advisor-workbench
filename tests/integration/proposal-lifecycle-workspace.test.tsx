import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalLifecycleWorkspace from "../../src/features/proposals/components/proposal-lifecycle-workspace";
import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "../../src/features/proposals/components/proposal-workflow-context";
import { buildNeutralProposalWorkflowContext } from "../../src/features/proposals/proposal-workflow-context-view-model";
import { proposalRiskImpactFixture } from "../fixtures/proposal-risk-impact";
import { proposalImplementationStatusFixture } from "../fixtures/proposal-implementation-status";
import { proposalDiscussionPackFixture } from "../fixtures/proposal-discussion-pack";
import type {
  AdvisoryPolicyEvaluationData,
  AdvisoryPolicySignOffPackageData,
  AdvisoryPolicyWorkflowData,
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalSummary,
  ProposalWorkflowEventsData,
} from "../../src/features/proposals/types";

const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const proposalListFixture: {
  items: ProposalSummary[];
  next_cursor: string | null;
} = {
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
  next_cursor: null,
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
      disclosure_requirements: [
        "advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
      ],
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
const listProposalsMock = vi.fn(
  async (_filters?: unknown) => proposalListFixture,
);
const getProposalRiskImpactMock = vi.fn(
  async (
    _proposalId: string,
    _portfolioId: string,
    _versionNo: number,
    _currentState: string,
  ) => proposalRiskImpactFixture(),
);
function implementationStatusFixture(
  proposalId = "PRP-READY",
  versionNo?: number,
) {
  const fixture = proposalImplementationStatusFixture();
  fixture.data.proposal_id = proposalId;
  fixture.data.title =
    proposalListFixture.items.find((item) => item.proposal_id === proposalId)
      ?.title ?? proposalId;
  fixture.data.current_version_no =
    versionNo ??
    proposalListFixture.items.find((item) => item.proposal_id === proposalId)
      ?.current_version_no ??
    1;
  fixture.data.related_version_no = fixture.data.current_version_no;
  fixture.data.latest_workflow_event!.related_version_no =
    fixture.data.current_version_no;
  fixture.data.lineage.proposal_id = proposalId;
  fixture.data.lineage.related_version_no = fixture.data.current_version_no;
  return fixture;
}
const getProposalExecutionStatusMock = vi.fn(
  async (
    proposalId: string,
    _portfolioId: string,
    versionNo: number,
    _currentState: string,
  ) => implementationStatusFixture(proposalId, versionNo),
);
const getProposalDiscussionPackMock = vi.fn(
  async (
    _proposalId: string,
    _portfolioId: string,
    _versionNo: number,
    _currentState: string,
  ) => proposalDiscussionPackFixture(),
);
function selectedProposalEvidence(proposalId: string) {
  const proposal =
    proposalListFixture.items.find((item) => item.proposal_id === proposalId) ??
    proposalListFixture.items[0];
  const versionNo = proposal.current_version_no ?? 1;
  const detail: ProposalDetailData = { proposal: { ...proposal } };
  const workflow: ProposalWorkflowEventsData = {
    proposal_id: proposalId,
    current_state: proposal.current_state,
    events: [
      {
        event_id: `event-${proposalId}`,
        event_type:
          proposal.current_state === "EXECUTION_READY"
            ? "COMPLIANCE_APPROVED"
            : "RISK_REVIEW_REQUESTED",
        from_state:
          proposal.current_state === "EXECUTION_READY"
            ? "AWAITING_CLIENT_CONSENT"
            : "DRAFT",
        to_state: proposal.current_state,
        actor_id: "advisor-1",
        occurred_at: "2026-08-21T09:00:00Z",
      },
    ],
  };
  const approvals: ProposalApprovalsData = {
    proposal_id: proposalId,
    current_state: proposal.current_state,
    approvals:
      proposal.current_state === "EXECUTION_READY"
        ? [
            {
              approval_id: `risk-${proposalId}`,
              approval_type: "RISK",
              approved: true,
              actor_id: "risk-officer-1",
              occurred_at: "2026-08-20T10:00:00Z",
            },
            {
              approval_id: `compliance-${proposalId}`,
              approval_type: "COMPLIANCE",
              approved: true,
              actor_id: "compliance-officer-1",
              occurred_at: "2026-08-21T09:00:00Z",
            },
          ]
        : [
            {
              approval_id: `risk-${proposalId}`,
              approval_type: "RISK",
              approved: false,
              actor_id: "risk-officer-1",
              occurred_at: "2026-08-21T09:00:00Z",
            },
          ],
  };
  const lineage: ProposalLineageData = {
    proposal_id: proposalId,
    versions: [{ version_no: versionNo, created_at: proposal.created_at }],
  };
  return { approvals, detail, lineage, workflow };
}
const getProposalMock = vi.fn(
  async (proposalId: string, _includeEvidence = false) =>
    selectedProposalEvidence(proposalId).detail,
);
const getProposalWorkflowEventsMock = vi.fn(
  async (proposalId: string) => selectedProposalEvidence(proposalId).workflow,
);
const getProposalApprovalsMock = vi.fn(
  async (proposalId: string) => selectedProposalEvidence(proposalId).approvals,
);
const getProposalLineageMock = vi.fn(
  async (proposalId: string) => selectedProposalEvidence(proposalId).lineage,
);
const getAdvisoryPolicyReviewQueueMock = vi.fn(
  async (_filters?: { evaluationStatus?: string; portfolioId?: string }) =>
    policyReviewQueueFixture,
);
const getAdvisoryPolicyEvaluationMock = vi.fn(
  async (_evaluationId: string): Promise<AdvisoryPolicyEvaluationData> => ({
    ...policyReviewQueueFixture.items[0],
    evaluation_hash: "sha256:policy-evaluation-1",
    source_refs: [
      "lotus-core:core_product_eligibility_target_market_complexity",
    ],
    evaluation_json: {
      rule_results: [
        {
          rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW",
          status: "PENDING_REVIEW",
        },
        { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
      ],
    },
  }),
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
  }),
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
    policyWorkflowFixture,
);
const recordAdvisoryPolicySignOffDecisionMock = vi.fn(
  async (
    _evaluationId: string,
    _payload: unknown,
    _idempotencyKey?: string,
  ) => ({
    workflow: {
      sign_off_status: "PENDING_REVIEW",
      client_ready_publication: "BLOCKED",
    },
  }),
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
  getProposalRiskImpact: (
    proposalId: string,
    portfolioId: string,
    versionNo: number,
    currentState: string,
  ) =>
    getProposalRiskImpactMock(proposalId, portfolioId, versionNo, currentState),
  getProposalExecutionStatus: (
    proposalId: string,
    portfolioId: string,
    versionNo: number,
    currentState: string,
  ) =>
    getProposalExecutionStatusMock(
      proposalId,
      portfolioId,
      versionNo,
      currentState,
    ),
  getProposalDiscussionPack: (
    proposalId: string,
    portfolioId: string,
    versionNo: number,
    currentState: string,
  ) =>
    getProposalDiscussionPackMock(
      proposalId,
      portfolioId,
      versionNo,
      currentState,
    ),
  getProposal: (proposalId: string, includeEvidence?: boolean) =>
    getProposalMock(proposalId, includeEvidence),
  getProposalWorkflowEvents: (proposalId: string) =>
    getProposalWorkflowEventsMock(proposalId),
  getProposalApprovals: (proposalId: string) =>
    getProposalApprovalsMock(proposalId),
  getProposalLineage: (proposalId: string) =>
    getProposalLineageMock(proposalId),
  listProposals: (filters: unknown) => listProposalsMock(filters),
  recordAdvisoryPolicySignOffDecision: (
    evaluationId: string,
    payload: unknown,
    idempotencyKey?: string,
  ) =>
    recordAdvisoryPolicySignOffDecisionMock(
      evaluationId,
      payload,
      idempotencyKey,
    ),
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
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  };
}

describe("ProposalLifecycleWorkspace", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=approval-queue",
    );
    routerPushMock.mockClear();
    listProposalsMock.mockReset();
    listProposalsMock.mockImplementation(
      async (_filters?: unknown) => proposalListFixture,
    );
    getProposalRiskImpactMock.mockReset();
    getProposalRiskImpactMock.mockImplementation(
      async (
        _proposalId: string,
        _portfolioId: string,
        _versionNo: number,
        _currentState: string,
      ) => proposalRiskImpactFixture(),
    );
    getProposalExecutionStatusMock.mockReset();
    getProposalExecutionStatusMock.mockImplementation(
      async (
        proposalId: string,
        _portfolioId: string,
        versionNo: number,
        _currentState: string,
      ) => implementationStatusFixture(proposalId, versionNo),
    );
    getProposalDiscussionPackMock.mockReset();
    getProposalDiscussionPackMock.mockImplementation(
      async (
        _proposalId: string,
        _portfolioId: string,
        _versionNo: number,
        _currentState: string,
      ) => proposalDiscussionPackFixture(),
    );
    getProposalMock.mockReset();
    getProposalMock.mockImplementation(
      async (proposalId: string, _includeEvidence = false) =>
        selectedProposalEvidence(proposalId).detail,
    );
    getProposalWorkflowEventsMock.mockReset();
    getProposalWorkflowEventsMock.mockImplementation(
      async (proposalId: string) =>
        selectedProposalEvidence(proposalId).workflow,
    );
    getProposalApprovalsMock.mockReset();
    getProposalApprovalsMock.mockImplementation(
      async (proposalId: string) =>
        selectedProposalEvidence(proposalId).approvals,
    );
    getProposalLineageMock.mockReset();
    getProposalLineageMock.mockImplementation(
      async (proposalId: string) =>
        selectedProposalEvidence(proposalId).lineage,
    );
    getAdvisoryPolicyReviewQueueMock.mockReset();
    getAdvisoryPolicyReviewQueueMock.mockImplementation(
      async (_filters?: { evaluationStatus?: string; portfolioId?: string }) =>
        policyReviewQueueFixture,
    );
    getAdvisoryPolicyEvaluationMock.mockReset();
    getAdvisoryPolicyEvaluationMock.mockImplementation(
      async (_evaluationId: string) => ({
        ...policyReviewQueueFixture.items[0],
        evaluation_hash: "sha256:policy-evaluation-1",
        source_refs: [
          "lotus-core:core_product_eligibility_target_market_complexity",
        ],
        evaluation_json: {
          rule_results: [
            {
              rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW",
              status: "PENDING_REVIEW",
            },
            { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
          ],
        },
      }),
    );
    getAdvisoryPolicySignOffPackageMock.mockReset();
    getAdvisoryPolicySignOffPackageMock.mockImplementation(
      async (_evaluationId: string) => ({
        package_posture: {
          sign_off_source_package: "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
          client_ready_publication: "BLOCKED",
        },
        lineage: {
          audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
          lineage_posture: { client_ready_publication: "BLOCKED" },
        },
      }),
    );
    getAdvisoryPolicyWorkflowMock.mockReset();
    getAdvisoryPolicyWorkflowMock.mockImplementation(
      async (_evaluationId: string) => policyWorkflowFixture,
    );
    recordAdvisoryPolicySignOffDecisionMock.mockReset();
    recordAdvisoryPolicySignOffDecisionMock.mockImplementation(
      async (
        _evaluationId: string,
        _payload: unknown,
        _idempotencyKey?: string,
      ) => ({
        workflow: {
          sign_off_status: "PENDING_REVIEW",
          client_ready_publication: "BLOCKED",
        },
      }),
    );
  });

  it("renders a source-backed implementation follow-up workspace for one selected proposal", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await waitFor(() =>
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: undefined,
      }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 4,
        name: "Accepted for implementation",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Implementation follow-up",
      }),
    ).toBeInTheDocument();
    expect(getProposalExecutionStatusMock).toHaveBeenCalledTimes(1);
    expect(getProposalExecutionStatusMock).toHaveBeenCalledWith(
      "PRP-READY",
      "PB_SG_GLOBAL_BAL_001",
      5,
      "EXECUTION_READY",
    );
    expect(
      screen.getByRole("listbox", {
        name: "Implementation follow-up proposals",
      }),
    ).toHaveTextContent("Execution handoff");
    expect(
      screen.queryByText("Technology concentration trim"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Current version · Version 5")).toBeInTheDocument();
    expect(screen.getAllByText("lotus-manage")).toHaveLength(2);
    expect(
      screen.getByText(/advisory implementation handoff only/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full proposal record" }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-READY?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=implementation",
    );
  });

  it("reads implementation evidence only for the selected worklist record", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        proposalListFixture.items[1],
        {
          proposal_id: "PRP-READY-2",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "EXECUTION_READY",
          current_version_no: 6,
          created_at: "2026-08-21T08:00:00Z",
          title: "Tactical liquidity reserve",
        },
      ],
      next_cursor: null,
    });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await screen.findByRole("heading", { name: "Accepted for implementation" });
    expect(getProposalExecutionStatusMock).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("option", { name: /Tactical liquidity reserve/ }),
    );

    await waitFor(() =>
      expect(getProposalExecutionStatusMock).toHaveBeenLastCalledWith(
        "PRP-READY-2",
        "PB_SG_GLOBAL_BAL_001",
        6,
        "EXECUTION_READY",
      ),
    );
    expect(getProposalExecutionStatusMock).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Tactical liquidity reserve",
      }),
    ).toBeInTheDocument();
  });

  it("keeps terminal implementation exceptions available for selected source review", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        proposalListFixture.items[1],
        {
          proposal_id: "PRP-REJECTED",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "REJECTED",
          current_version_no: 5,
          created_at: "2026-08-21T10:00:00Z",
          title: "Rejected implementation handoff",
        },
      ],
      next_cursor: null,
    });
    getProposalExecutionStatusMock.mockImplementation(
      async (proposalId: string, _portfolioId: string, versionNo: number) => {
        const fixture = implementationStatusFixture(proposalId, versionNo);
        if (proposalId === "PRP-REJECTED") {
          fixture.data.current_state = "REJECTED";
          fixture.data.handoff_status = "REJECTED";
          fixture.data.status_family = "attention";
          fixture.data.next_action = "INVESTIGATE_REJECTION";
          fixture.data.attention_required = true;
          fixture.data.terminal = true;
          fixture.data.reason_code = "implementation_rejected";
          fixture.data.latest_workflow_event!.event_type = "EXECUTION_REJECTED";
        }
        return fixture;
      },
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await screen.findByRole("heading", { name: "Accepted for implementation" });
    fireEvent.click(
      screen.getByRole("option", { name: /Rejected implementation handoff/ }),
    );

    expect(
      await screen.findByRole("heading", { name: "Handoff rejected" }),
    ).toBeInTheDocument();
    expect(getProposalExecutionStatusMock).toHaveBeenLastCalledWith(
      "PRP-REJECTED",
      "PB_SG_GLOBAL_BAL_001",
      5,
      "REJECTED",
    );
    expect(
      screen.getAllByText(/Review the rejection with the implementation team/),
    ).toHaveLength(2);
  });

  it("keeps implementation evidence permission failure distinct and does not infer progress", async () => {
    getProposalExecutionStatusMock.mockRejectedValueOnce(
      new Error("Proposal implementation status failed (403): forbidden"),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Implementation information is restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no implementation status is shown/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry implementation status" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Accepted for implementation" }),
    ).not.toBeInTheDocument();
  });

  it("shows partial implementation evidence without hiding the confirmed handoff status", async () => {
    const partial = implementationStatusFixture();
    partial.data.evidence_state = "partial";
    partial.data.reason_code = "implementation_evidence_partial";
    partial.data.execution_provider = null;
    partial.data.capabilities = partial.data.capabilities.map((capability) =>
      capability.key === "provider_reference"
        ? { ...capability, state: "not_available", source_service: null }
        : capability,
    );
    getProposalExecutionStatusMock.mockResolvedValueOnce(partial);

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Handoff information incomplete",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Accepted for implementation" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not reported").length).toBeGreaterThan(0);
    expect(screen.getByText(/references are missing/)).toBeInTheDocument();
  });

  it("announces implementation refresh success only after list and evidence reconfirmation", async () => {
    let resolveRefresh:
      | ((value: ReturnType<typeof implementationStatusFixture>) => void)
      | undefined;
    getProposalExecutionStatusMock
      .mockResolvedValueOnce(implementationStatusFixture())
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof implementationStatusFixture>>(
            (resolve) => {
              resolveRefresh = resolve;
            },
          ),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await screen.findByRole("heading", { name: "Accepted for implementation" });
    const refresh = screen.getByRole("button", {
      name: "Refresh implementation status",
    });
    refresh.focus();
    fireEvent.click(refresh);
    const status = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() =>
      expect(status).toHaveAttribute("data-state", "pending"),
    );
    expect(
      within(status).queryByText("Current handoff available"),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveRefresh?.(implementationStatusFixture());
    });
    await waitFor(() =>
      expect(status).toHaveAttribute("data-state", "confirmed"),
    );
    expect(
      within(status).getByText("Current handoff available"),
    ).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveFocus());
  });

  it("refreshes implementation evidence against an advanced source lifecycle identity", async () => {
    let resolveAdvancedEvidence:
      | ((value: ReturnType<typeof implementationStatusFixture>) => void)
      | undefined;
    listProposalsMock
      .mockResolvedValueOnce(proposalListFixture)
      .mockResolvedValueOnce({
        items: [
          proposalListFixture.items[0],
          {
            ...proposalListFixture.items[1],
            current_state: "EXECUTED",
          },
        ],
        next_cursor: null,
      });
    const advancedEvidence = implementationStatusFixture("PRP-READY", 5);
    advancedEvidence.data.current_state = "EXECUTED";
    advancedEvidence.data.handoff_status = "EXECUTED";
    advancedEvidence.data.status_family = "completed";
    advancedEvidence.data.next_action = "NO_ACTION";
    advancedEvidence.data.attention_required = false;
    advancedEvidence.data.terminal = true;
    advancedEvidence.data.reason_code = "implementation_executed";
    advancedEvidence.data.executed_at = "2026-08-20T09:05:00Z";
    advancedEvidence.data.latest_workflow_event!.event_type = "EXECUTED";
    getProposalExecutionStatusMock
      .mockResolvedValueOnce(implementationStatusFixture())
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof implementationStatusFixture>>(
            (resolve) => {
              resolveAdvancedEvidence = resolve;
            },
          ),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await screen.findByRole("heading", { name: "Accepted for implementation" });
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh implementation status" }),
    );

    await waitFor(() =>
      expect(getProposalExecutionStatusMock).toHaveBeenLastCalledWith(
        "PRP-READY",
        "PB_SG_GLOBAL_BAL_001",
        5,
        "EXECUTED",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Accepted for implementation" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Implementation reported complete",
      }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveAdvancedEvidence?.(advancedEvidence);
    });

    expect(
      await screen.findByRole("heading", {
        name: "Implementation reported complete",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Current handoff available"),
    ).toBeInTheDocument();
  });

  it("does not publish an older implementation window after a later selection refresh", async () => {
    const firstProposal = { ...proposalListFixture.items[1] };
    const secondProposal = {
      ...proposalListFixture.items[1],
      proposal_id: "PRP-INCOME",
      title: "Income mandate implementation",
    };
    const initialWindow = {
      items: [firstProposal, secondProposal],
      next_cursor: null,
    };
    const olderWindow = {
      items: [
        firstProposal,
        { ...secondProposal, title: "Superseded income implementation" },
      ],
      next_cursor: null,
    };
    const currentWindow = {
      items: [
        firstProposal,
        { ...secondProposal, title: "Current income implementation" },
      ],
      next_cursor: null,
    };
    listProposalsMock
      .mockResolvedValueOnce(initialWindow)
      .mockResolvedValueOnce(olderWindow)
      .mockResolvedValueOnce(currentWindow);

    let firstProposalReads = 0;
    let resolveOlderRefresh:
      | ((value: ReturnType<typeof implementationStatusFixture>) => void)
      | undefined;
    getProposalExecutionStatusMock.mockImplementation(
      async (proposalId: string, _portfolioId: string, versionNo: number) => {
        if (proposalId === "PRP-READY") {
          firstProposalReads += 1;
          if (firstProposalReads === 2) {
            return await new Promise<
              ReturnType<typeof implementationStatusFixture>
            >((resolve) => {
              resolveOlderRefresh = resolve;
            });
          }
        }
        return implementationStatusFixture(proposalId, versionNo);
      },
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="implementation"
      />,
    );

    await screen.findByRole("heading", { name: "Accepted for implementation" });
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh implementation status" }),
    );
    await waitFor(() => expect(firstProposalReads).toBe(2));

    fireEvent.click(
      screen.getByRole("option", { name: /Income mandate implementation/ }),
    );
    await screen.findByRole("heading", { name: "Accepted for implementation" });
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh implementation status" }),
    );

    expect(
      await screen.findByRole("option", {
        name: /Current income implementation/,
      }),
    ).toBeInTheDocument();

    await act(async () => {
      resolveOlderRefresh?.(implementationStatusFixture("PRP-READY", 5));
    });

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: /Current income implementation/ }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("option", {
        name: /Superseded income implementation/,
      }),
    ).not.toBeInTheDocument();
  });

  it("recovers implementation evidence when a missing proposal version becomes available", async () => {
    const { current_version_no: _currentVersionNo, ...unversionedProposal } =
      proposalListFixture.items[1];
    let resolveRecoveredEvidence:
      | ((value: ReturnType<typeof implementationStatusFixture>) => void)
      | undefined;
    listProposalsMock
      .mockResolvedValueOnce({
        items: [unversionedProposal],
        next_cursor: null,
      })
      .mockResolvedValueOnce({
        items: [proposalListFixture.items[1]],
        next_cursor: null,
      });
    getProposalExecutionStatusMock.mockImplementationOnce(
      async () =>
        await new Promise<ReturnType<typeof implementationStatusFixture>>(
          (resolve) => {
            resolveRecoveredEvidence = resolve;
          },
        ),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="implementation"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proposal version is not available",
      }),
    ).toBeInTheDocument();
    expect(getProposalExecutionStatusMock).not.toHaveBeenCalled();

    const recheck = screen.getByRole("button", {
      name: "Recheck proposal version",
    });
    recheck.focus();
    fireEvent.click(recheck);

    const pendingRecheck = await screen.findByRole("button", {
      name: "Rechecking proposal version…",
    });
    expect(pendingRecheck).toHaveAttribute("aria-disabled", "true");
    const pendingStatus = screen.getByTestId("workbench-refresh-status");
    expect(pendingStatus).toHaveAttribute("data-state", "pending");
    expect(
      within(pendingStatus).getByText("Checking the selected proposal"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Decision posture")).not.toBeInTheDocument();
    expect(screen.getByText("Proposal coverage")).toBeInTheDocument();

    await act(async () => {
      resolveRecoveredEvidence?.(implementationStatusFixture("PRP-READY", 5));
    });

    expect(
      await within(
        screen.getByRole("region", {
          name: "Selected proposal implementation review",
        }),
      ).findByRole("heading", { name: "Accepted for implementation" }),
    ).toBeInTheDocument();
    expect(getProposalExecutionStatusMock).toHaveBeenCalledWith(
      "PRP-READY",
      "PB_SG_GLOBAL_BAL_001",
      5,
      "EXECUTION_READY",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Refresh implementation status",
        }),
      ).toHaveFocus(),
    );
    expect(screen.getByTestId("workbench-refresh-status")).toHaveAttribute(
      "data-state",
      "confirmed",
    );
  });

  it("renders a selected proposal decision workspace from Gateway risk and impact evidence", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: undefined,
        state: "RISK_REVIEW",
      });
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Risk and Impact" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 4,
        name: "Requires Risk Review",
      }),
    ).toBeInTheDocument();
    expect(getProposalRiskImpactMock).toHaveBeenCalledTimes(1);
    expect(getProposalRiskImpactMock).toHaveBeenCalledWith(
      "PRP-RISK",
      "PB_SG_GLOBAL_BAL_001",
      3,
      "RISK_REVIEW",
    );
    expect(
      screen.getByRole("listbox", { name: "Risk and Impact proposals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Proposals in this view" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Current and proposed allocation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("USD 850,000.00 · 12 positions"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("USD 775,000.00 · 13 positions"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Risk review is required before client discussion."),
    ).toBeInTheDocument();
    const decisionBrief = screen
      .getByRole("heading", { level: 4, name: "Requires Risk Review" })
      .closest("section");
    expect(decisionBrief).not.toBeNull();
    expect(
      within(decisionBrief!).getByText("Workflow gate"),
    ).toBeInTheDocument();
    expect(
      within(decisionBrief!).getByText("Risk Review Required"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 blocking in register")).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow gate reasons")).toHaveTextContent(
      "Material Concentration Change · Rule Engine · High",
    );
    expect(
      screen.getByText("corr-proposal-risk-impact-001"),
    ).toBeInTheDocument();
    expect(screen.getByText("Correlation ID")).toBeInTheDocument();
    expect(
      within(
        screen.getByText("Decision support reference").closest("div")!,
      ).getByText("current_version.proposal_result.proposal_decision_summary"),
    ).toBeInTheDocument();
    expect(screen.getByText("Benchmark and limits")).toBeInTheDocument();
    expect(screen.getAllByText("Not supported")).toHaveLength(3);
    expect(screen.queryByText("Execution handoff")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Proposal lifecycle counts"),
    ).toHaveTextContent(/1\s*In view/);
  });

  it("shows an explicit no-fallback error and restores retry focus after source recovery", async () => {
    getProposalRiskImpactMock
      .mockRejectedValueOnce(new Error("Gateway unavailable"))
      .mockResolvedValueOnce(proposalRiskImpactFixture());

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Risk and impact evidence is unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Current risk and impact evidence could not be retrieved. The selected proposal remains visible, but it must not progress on earlier evidence. Retry before continuing.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Gateway unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("Requires Risk Review")).not.toBeInTheDocument();
    const retry = screen.getByRole("button", {
      name: "Retry proposal evidence",
    });
    retry.focus();
    fireEvent.click(retry);

    expect(
      await screen.findByRole("heading", {
        level: 4,
        name: "Requires Risk Review",
      }),
    ).toBeInTheDocument();
    const refreshStatus = screen.getByTestId("workbench-refresh-status");
    expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
    expect(
      within(refreshStatus).getByText("Selected proposal evidence is current"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Refresh proposal evidence" }),
      ).toHaveFocus();
    });
  });

  it("keeps prior evidence visible and announces a failed manual refresh", async () => {
    let settleRetry:
      | ((value: ReturnType<typeof proposalRiskImpactFixture>) => void)
      | undefined;
    getProposalRiskImpactMock
      .mockResolvedValueOnce(proposalRiskImpactFixture())
      .mockRejectedValueOnce(new Error("Gateway unavailable"))
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof proposalRiskImpactFixture>>(
            (resolve) => {
              settleRetry = resolve;
            },
          ),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    const refresh = await screen.findByRole("button", {
      name: "Refresh proposal evidence",
    });
    fireEvent.click(refresh);

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() => {
      expect(refreshStatus).toHaveAttribute("data-state", "failed");
    });
    expect(
      within(refreshStatus).getByText("Refresh failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Requires Risk Review",
      }),
    ).toBeInTheDocument();

    fireEvent.click(refresh);
    await waitFor(() => {
      expect(refreshStatus).toHaveAttribute("data-state", "pending");
    });
    expect(
      within(refreshStatus).getByText("Checking selected proposal evidence"),
    ).toBeInTheDocument();

    await act(async () => {
      settleRetry?.(proposalRiskImpactFixture());
    });
    await waitFor(() => {
      expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
    });
  });

  it("announces a failed retry when no cached evidence is available", async () => {
    getProposalRiskImpactMock.mockRejectedValue(
      new Error("Gateway unavailable"),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    const retry = await screen.findByRole("button", {
      name: "Retry proposal evidence",
    });
    fireEvent.click(retry);

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() => {
      expect(refreshStatus).toHaveAttribute("data-state", "failed");
    });
    expect(
      within(refreshStatus).getByText("Refresh failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Risk and impact evidence is unavailable",
      }),
    ).toBeInTheDocument();
  });

  it("reads detail only for the selected proposal instead of fanning out across the worklist", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        proposalListFixture.items[0],
        {
          ...proposalListFixture.items[0],
          proposal_id: "PRP-RISK-INCOME",
          title: "Income allocation review",
        },
      ],
      next_cursor: null,
    });
    getProposalRiskImpactMock.mockImplementation(
      async (proposalId: string, _portfolioId: string) => {
        const envelope = proposalRiskImpactFixture();
        envelope.data.proposal_id = proposalId;
        envelope.data.title =
          proposalId === "PRP-RISK-INCOME"
            ? "Income allocation review"
            : "Technology concentration trim";
        return envelope;
      },
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Technology concentration trim",
      }),
    ).toBeInTheDocument();
    expect(getProposalRiskImpactMock).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("option", { name: /Income allocation review/ }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Income allocation review",
      }),
    ).toBeInTheDocument();
    expect(getProposalRiskImpactMock).toHaveBeenCalledTimes(2);
    expect(getProposalRiskImpactMock).toHaveBeenLastCalledWith(
      "PRP-RISK-INCOME",
      "PB_SG_GLOBAL_BAL_001",
      3,
      "RISK_REVIEW",
    );
  });

  it("does not move focus back to a refresh control after the advisor changes selection", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        proposalListFixture.items[0],
        {
          ...proposalListFixture.items[0],
          proposal_id: "PRP-RISK-INCOME",
          title: "Income allocation review",
        },
      ],
      next_cursor: null,
    });
    let settleRefresh:
      | ((value: ReturnType<typeof proposalRiskImpactFixture>) => void)
      | undefined;
    getProposalRiskImpactMock
      .mockResolvedValueOnce(proposalRiskImpactFixture())
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof proposalRiskImpactFixture>>(
            (resolve) => {
              settleRefresh = resolve;
            },
          ),
      )
      .mockImplementationOnce(async (proposalId: string) => {
        const envelope = proposalRiskImpactFixture();
        envelope.data.proposal_id = proposalId;
        envelope.data.title = "Income allocation review";
        return envelope;
      });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    const refresh = await screen.findByRole("button", {
      name: "Refresh proposal evidence",
    });
    refresh.focus();
    fireEvent.click(refresh);

    const nextProposal = screen.getByRole("option", {
      name: /Income allocation review/,
    });
    nextProposal.focus();
    fireEvent.click(nextProposal);
    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Income allocation review",
      }),
    ).toBeInTheDocument();

    await act(async () => {
      settleRefresh?.(proposalRiskImpactFixture());
    });
    await waitFor(() => expect(nextProposal).toHaveFocus());
    expect(
      screen.queryByTestId("workbench-refresh-status"),
    ).not.toBeInTheDocument();
  });

  it("does not let a late refresh for a prior proposal clear the current confirmation", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        proposalListFixture.items[0],
        {
          ...proposalListFixture.items[0],
          proposal_id: "PRP-RISK-INCOME",
          title: "Income allocation review",
        },
      ],
      next_cursor: null,
    });
    let settleFirstRefresh:
      | ((value: ReturnType<typeof proposalRiskImpactFixture>) => void)
      | undefined;
    let settleSecondRefresh:
      | ((value: ReturnType<typeof proposalRiskImpactFixture>) => void)
      | undefined;
    getProposalRiskImpactMock
      .mockResolvedValueOnce(proposalRiskImpactFixture())
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof proposalRiskImpactFixture>>(
            (resolve) => {
              settleFirstRefresh = resolve;
            },
          ),
      )
      .mockImplementationOnce(async (proposalId: string) => {
        const envelope = proposalRiskImpactFixture();
        envelope.data.proposal_id = proposalId;
        envelope.data.title = "Income allocation review";
        return envelope;
      })
      .mockImplementationOnce(
        async (proposalId: string) =>
          await new Promise<ReturnType<typeof proposalRiskImpactFixture>>(
            (resolve) => {
              settleSecondRefresh = (value) => {
                value.data.proposal_id = proposalId;
                value.data.title = "Income allocation review";
                resolve(value);
              };
            },
          ),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Refresh proposal evidence" }),
    );
    fireEvent.click(
      screen.getByRole("option", { name: /Income allocation review/ }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Income allocation review",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh proposal evidence" }),
    );
    await act(async () => {
      settleSecondRefresh?.(proposalRiskImpactFixture());
    });
    await waitFor(() => {
      expect(screen.getByTestId("workbench-refresh-status")).toHaveAttribute(
        "data-state",
        "confirmed",
      );
    });
    expect(screen.getByTestId("workbench-refresh-status")).toHaveTextContent(
      "PRP-RISK-INCOME · Version 3",
    );

    await act(async () => {
      settleFirstRefresh?.(proposalRiskImpactFixture());
    });
    expect(screen.getByTestId("workbench-refresh-status")).toHaveAttribute(
      "data-state",
      "confirmed",
    );
    expect(screen.getByTestId("workbench-refresh-status")).toHaveTextContent(
      "PRP-RISK-INCOME · Version 3",
    );
  });

  it("keeps a non-ready decision register explicitly unknown", async () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.decision.state = "unavailable";
    envelope.data.decision.approval_requirements = [];
    envelope.data.decision.material_changes = [];
    envelope.data.decision.missing_evidence = [];
    getProposalRiskImpactMock.mockResolvedValueOnce(envelope);

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="risk-impact"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Decision register is not available",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Decision not confirmed")).toBeInTheDocument();
    const decisionBrief = screen
      .getByRole("heading", { level: 4, name: "Decision not confirmed" })
      .closest("section");
    expect(decisionBrief).not.toBeNull();
    expect(
      within(decisionBrief!).getByText("Workflow gate"),
    ).toBeInTheDocument();
    expect(
      within(decisionBrief!).getByText("Gate not confirmed"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/blocking in register/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("No active approval requirement is reported."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Supporting evidence is incomplete",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Partial evidence")).toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
  });

  it("withholds unusable source sections while retaining response lineage", async () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.allocation.state = "unavailable";
    envelope.data.risk.state = "unavailable";
    envelope.data.workflow_gate.state = "unavailable";
    getProposalRiskImpactMock.mockResolvedValueOnce(envelope);

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Allocation comparison is not available",
      }),
    ).toBeInTheDocument();
    const recordHeader = screen
      .getByText("Evidence incomplete")
      .closest("header");
    expect(recordHeader).not.toBeNull();
    expect(
      within(recordHeader!).queryByText("Evidence available"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Risk evidence is not available" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Workflow requirements are not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("68%")).not.toBeInTheDocument();
    expect(
      screen.queryByText("USD 850,000.00 · 12 positions"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Risk Review Required")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Evidence scope and lineage"));
    expect(screen.getByText("Response contract")).toBeInTheDocument();
    expect(screen.getByText("proposal-risk-impact.v1")).toBeInTheDocument();
    expect(screen.getByText("Allocation contract")).toBeInTheDocument();
    expect(screen.getByText("advisory-simulation.v1")).toBeInTheDocument();
    expect(screen.getByText("Allocation calculator")).toBeInTheDocument();
    expect(
      screen.getByText("lotus-core.allocation-calculator.v1"),
    ).toBeInTheDocument();
  });

  it("names expected allocation views missing from partial source evidence", async () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.overall_state = "partial";
    envelope.data.allocation.state = "partial";
    envelope.data.allocation.expected_dimensions.push("currency", "sector");
    getProposalRiskImpactMock.mockResolvedValueOnce(envelope);

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="risk-impact"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Some allocation views are unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The comparison does not include Currency, Sector. Available allocation views remain visible. Review the full proposal record before relying on the missing view.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Asset Class allocation comparison"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Supporting evidence is incomplete",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Partial evidence")).toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
  });

  it("does not request evidence when the selected proposal version is missing", async () => {
    const { current_version_no: _currentVersionNo, ...proposalWithoutVersion } =
      proposalListFixture.items[0];
    listProposalsMock.mockResolvedValueOnce({
      items: [proposalWithoutVersion],
      next_cursor: null,
    });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="risk-impact"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proposal version is not available",
      }),
    ).toBeInTheDocument();
    expect(getProposalRiskImpactMock).not.toHaveBeenCalled();
  });

  it("publishes selected risk evidence failure to the shared workflow rail", async () => {
    getProposalRiskImpactMock.mockRejectedValueOnce(
      new Error("Gateway unavailable"),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="risk-impact"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Supporting evidence is incomplete",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "One or more supporting decision-evidence sources are unavailable.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Restore the unavailable decision evidence before relying on the current workflow status.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps permission-blocked evidence distinct from service failure", async () => {
    getProposalRiskImpactMock.mockRejectedValueOnce(
      new Error("Proposal risk and impact failed (403): forbidden"),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="risk-impact"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Risk and impact access is not available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry proposal evidence" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Supporting evidence is restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Supporting decision evidence in this view is restricted by source entitlements.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Proposals in this view" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Proposal information is restricted",
      }),
    ).not.toBeInTheDocument();
  });

  it("publishes the Gateway-backed queue summary to the shared workflow rail", async () => {
    renderWithQueryClient(
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
      </ProposalWorkflowContextProvider>,
    );

    const railHeading = await screen.findByRole("heading", {
      level: 2,
      name: "1 decision is not approved",
    });
    const workflowRail = railHeading.closest("article");
    expect(workflowRail).not.toBeNull();
    expect(
      within(workflowRail!).getByText("Approval exception"),
    ).toBeInTheDocument();
    expect(within(workflowRail!).getByText("PRP-RISK")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Gateway-backed proposal detail, workflow, approvals, and lineage",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/kyc validity verified/i),
    ).not.toBeInTheDocument();
  });

  it("keeps the selected proposal posture beside the keyboard-operable worklist", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    const worklist = await screen.findByRole("listbox", {
      name: "Approval Queue proposals",
    });
    const options = within(worklist).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveTextContent("Version 3");
    expect(options[0]).toHaveTextContent("19 Aug 2026");

    const selectedProposal = screen.getByRole("region", {
      name: "Selected proposal decision",
    });
    expect(
      within(selectedProposal).getByRole("heading", {
        name: "Technology concentration trim",
      }),
    ).toBeInTheDocument();
    expect(
      await within(selectedProposal).findByRole("heading", {
        name: "1 decision is not approved",
      }),
    ).toBeInTheDocument();
    expect(
      within(selectedProposal).getByText("Approval exception"),
    ).toBeInTheDocument();
    expect(
      within(selectedProposal).getByRole("link", {
        name: "Open full proposal review",
      }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=approval-queue",
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(
      within(selectedProposal).getByRole("heading", {
        name: "Execution handoff",
      }),
    ).toBeInTheDocument();
    expect(
      await within(selectedProposal).findByRole("heading", {
        name: "2 approval records confirmed",
      }),
    ).toBeInTheDocument();
    expect(
      within(selectedProposal).getByText("Approval evidence recorded"),
    ).toBeInTheDocument();
    expect(getProposalMock).toHaveBeenCalledTimes(2);
    expect(getProposalWorkflowEventsMock).toHaveBeenCalledTimes(2);
    expect(getProposalApprovalsMock).toHaveBeenCalledTimes(2);
    expect(getProposalLineageMock).toHaveBeenCalledTimes(2);
    expect(routerPushMock).toHaveBeenLastCalledWith(
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&selectedRecordId=PRP-READY&mode=approval-queue",
      { scroll: false },
    );

    fireEvent.keyDown(options[1], { key: "Enter" });
    expect(selectedProposal).toHaveFocus();
    fireEvent.keyDown(selectedProposal, { key: "Escape" });
    expect(options[1]).toHaveFocus();
  });

  it("admits an exact URL-selected proposal from the current source window", async () => {
    window.history.replaceState(
      {},
      "",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=approval-queue&selectedRecordId=PRP-READY",
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          selectedRecordId: "PRP-READY",
        }}
        mode="approval-queue"
      />,
    );

    const selectedOption = await screen.findByRole("option", {
      name: /Execution handoff/,
    });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
    expect(getProposalMock).toHaveBeenCalledTimes(1);
    expect(getProposalMock).toHaveBeenCalledWith("PRP-READY", true);
    expect(getProposalApprovalsMock).toHaveBeenCalledWith("PRP-READY");
  });

  it("rejects a URL-selected proposal that is absent from the source window", async () => {
    window.history.replaceState(
      {},
      "",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=approval-queue&selectedRecordId=PRP-FOREIGN",
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          selectedRecordId: "PRP-FOREIGN",
        }}
        mode="approval-queue"
      />,
    );

    const selectedOption = await screen.findByRole("option", {
      name: /Technology concentration trim/,
    });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
    expect(getProposalMock).toHaveBeenCalledTimes(1);
    expect(getProposalMock).toHaveBeenCalledWith("PRP-RISK", true);
    expect(getProposalMock).not.toHaveBeenCalledWith("PRP-FOREIGN", true);
    expect(getProposalApprovalsMock).not.toHaveBeenCalledWith("PRP-FOREIGN");
  });

  it("does not interpret an empty approval register as approval not required", async () => {
    getProposalApprovalsMock.mockImplementationOnce(
      async (proposalId: string) => ({
        ...selectedProposalEvidence(proposalId).approvals,
        approvals: [],
      }),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "No approval decision is recorded",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Gateway returned an empty approval register. This does not mean that approval is not required.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No approval records")).toBeInTheDocument();
  });

  it("hides approval records when selected proposal source identity conflicts", async () => {
    getProposalWorkflowEventsMock.mockImplementationOnce(
      async (proposalId: string) => ({
        ...selectedProposalEvidence(proposalId).workflow,
        current_state: "DRAFT",
      }),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Workflow state does not agree",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/approval records remain hidden/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recorded approval decisions" }),
    ).not.toBeInTheDocument();
  });

  it("fails closed when agreeing detail sources have advanced beyond the selected worklist record", async () => {
    const advanced = selectedProposalEvidence("PRP-RISK");
    advanced.detail.proposal.current_state = "COMPLIANCE_REVIEW";
    advanced.detail.proposal.current_version_no = 4;
    advanced.workflow.current_state = "COMPLIANCE_REVIEW";
    advanced.approvals.current_state = "COMPLIANCE_REVIEW";
    advanced.lineage.versions = [{ version_no: 4 }];
    getProposalMock.mockResolvedValueOnce(advanced.detail);
    getProposalWorkflowEventsMock.mockResolvedValueOnce(advanced.workflow);
    getProposalApprovalsMock.mockResolvedValueOnce(advanced.approvals);
    getProposalLineageMock.mockResolvedValueOnce(advanced.lineage);

    renderWithQueryClient(
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
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Worklist stage is no longer current",
      }),
    ).toBeInTheDocument();
    const selectedProposal = screen.getByRole("region", {
      name: "Selected proposal decision",
    });
    expect(
      within(selectedProposal).getByText(
        /selected worklist record no longer agrees/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recorded approval decisions" }),
    ).not.toBeInTheDocument();
  });

  it("fails closed when the selected worklist omits source portfolio identity", async () => {
    listProposalsMock.mockResolvedValueOnce({
      ...proposalListFixture,
      items: proposalListFixture.items.map((proposal, index) =>
        index === 0
          ? { ...proposal, portfolio_id: undefined }
          : { ...proposal },
      ),
    });

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Portfolio identity does not agree",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recorded approval decisions" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
  });

  it("keeps restricted approval evidence distinct in the selected pane and shared rail", async () => {
    getProposalApprovalsMock.mockRejectedValueOnce(
      new Error("Proposal approvals failed (403): forbidden"),
    );

    renderWithQueryClient(
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
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Approval evidence is restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Supporting evidence is restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry approval evidence" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
  });

  it("keeps confirmed evidence visible and restores focus after refresh failure", async () => {
    getProposalApprovalsMock
      .mockImplementationOnce(
        async (proposalId: string) =>
          selectedProposalEvidence(proposalId).approvals,
      )
      .mockRejectedValueOnce(
        new Error("Proposal approvals failed (503): unavailable"),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    await screen.findByRole("heading", {
      name: "1 decision is not approved",
    });
    const refresh = screen.getByRole("button", { name: "Refresh evidence" });
    refresh.focus();
    fireEvent.click(refresh);

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "failed"),
    );
    expect(
      within(refreshStatus).getByText("Source refresh failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1 decision is not approved" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveFocus());
  });

  it("hides cached approval evidence when refresh reports that access was revoked", async () => {
    getProposalApprovalsMock
      .mockImplementationOnce(
        async (proposalId: string) =>
          selectedProposalEvidence(proposalId).approvals,
      )
      .mockRejectedValueOnce(
        new Error("Proposal approvals failed (403): forbidden"),
      );

    renderWithQueryClient(
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
      </ProposalWorkflowContextProvider>,
    );

    await screen.findByRole("heading", {
      name: "1 decision is not approved",
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh evidence" }));

    expect(
      await screen.findByRole("heading", {
        name: "Approval evidence is restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recorded approval decisions" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
    expect(screen.getByTestId("workbench-refresh-status")).toHaveAttribute(
      "data-state",
      "failed",
    );
    const restrictedRailHeading = screen.getByRole("heading", {
      name: "Supporting evidence is restricted",
    });
    const restrictedRail = restrictedRailHeading.closest("article");
    expect(restrictedRail).not.toBeNull();
    expect(
      within(restrictedRail!).queryByText("PRP-RISK"),
    ).not.toBeInTheDocument();
    expect(
      within(restrictedRail!).queryByText("Approval records"),
    ).not.toBeInTheDocument();
    expect(
      within(restrictedRail!).queryByText("Active version"),
    ).not.toBeInTheDocument();
  });

  it("announces confirmation only after all selected approval sources refresh", async () => {
    let resolveApprovals: ((value: ProposalApprovalsData) => void) | undefined;
    getProposalApprovalsMock
      .mockImplementationOnce(
        async (proposalId: string) =>
          selectedProposalEvidence(proposalId).approvals,
      )
      .mockImplementationOnce(
        async (_proposalId: string) =>
          await new Promise<ProposalApprovalsData>((resolve) => {
            resolveApprovals = resolve;
          }),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    await screen.findByRole("heading", {
      name: "1 decision is not approved",
    });
    const refresh = screen.getByRole("button", { name: "Refresh evidence" });
    fireEvent.click(refresh);
    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "pending"),
    );
    expect(
      within(refreshStatus).getByText("Reconfirming selected proposal"),
    ).toBeInTheDocument();
    expect(
      within(refreshStatus).queryByText("Selected proposal evidence confirmed"),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveApprovals?.(selectedProposalEvidence("PRP-RISK").approvals);
    });
    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "confirmed"),
    );
    expect(
      within(refreshStatus).getByText("Selected proposal evidence confirmed"),
    ).toBeInTheDocument();
  });

  it("confirms refreshed evidence when the same selected proposal advances version", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    await screen.findByRole("heading", {
      name: "1 decision is not approved",
    });

    const advancedSummary: ProposalSummary = {
      ...proposalListFixture.items[0],
      current_state: "COMPLIANCE_REVIEW",
      current_version_no: 4,
    };
    const advancedEvidence = selectedProposalEvidence("PRP-RISK");
    advancedEvidence.detail.proposal = { ...advancedSummary };
    advancedEvidence.workflow.current_state = "COMPLIANCE_REVIEW";
    advancedEvidence.approvals.current_state = "COMPLIANCE_REVIEW";
    advancedEvidence.lineage.versions = [{ version_no: 4 }];
    listProposalsMock.mockResolvedValueOnce({
      ...proposalListFixture,
      items: [advancedSummary, proposalListFixture.items[1]],
    });
    getProposalMock.mockResolvedValue(advancedEvidence.detail);
    getProposalWorkflowEventsMock.mockResolvedValue(advancedEvidence.workflow);
    getProposalApprovalsMock.mockResolvedValue(advancedEvidence.approvals);
    getProposalLineageMock.mockResolvedValue(advancedEvidence.lineage);

    fireEvent.click(screen.getByRole("button", { name: "Refresh evidence" }));

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "confirmed"),
    );
    expect(
      within(refreshStatus).getByText("Selected proposal evidence confirmed"),
    ).toBeInTheDocument();
    expect(within(refreshStatus).getByText(/Version 4/)).toBeInTheDocument();
    expect(screen.getByText("Active version").nextSibling).toHaveTextContent(
      "4",
    );
  });

  it("rejects a transport-success refresh whose compound approval evidence conflicts", async () => {
    getProposalWorkflowEventsMock
      .mockImplementationOnce(
        async (proposalId: string) =>
          selectedProposalEvidence(proposalId).workflow,
      )
      .mockImplementationOnce(async (proposalId: string) => ({
        ...selectedProposalEvidence(proposalId).workflow,
        current_state: "DRAFT",
      }));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    await screen.findByRole("heading", {
      name: "1 decision is not approved",
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh evidence" }));

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "failed"),
    );
    expect(
      within(refreshStatus).getByText("Source refresh failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Workflow state does not agree" }),
    ).toBeInTheDocument();
    expect(
      within(refreshStatus).queryByText("Selected proposal evidence confirmed"),
    ).not.toBeInTheDocument();
  });

  it("resets selected proposal identity when the source window changes", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        ...proposalListFixture,
        next_cursor: "cursor-window-2",
      })
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
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    const worklist = await screen.findByRole("listbox", {
      name: "Approval Queue proposals",
    });
    const firstWindowOptions = within(worklist).getAllByRole("option");
    fireEvent.keyDown(firstWindowOptions[0], { key: "ArrowDown" });
    expect(firstWindowOptions[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next proposals" }));

    const nextWindowProposal = await screen.findByRole("option", {
      name: /Consent evidence review/,
    });
    expect(nextWindowProposal).toHaveAttribute("aria-selected", "true");
    expect(
      screen.queryByRole("option", { name: /Execution handoff/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps suitability posture loading until the policy queue and selected evidence settle", async () => {
    let resolvePolicyQueue:
      ((value: typeof policyReviewQueueFixture) => void) | undefined;
    let resolvePolicyEvaluation:
      | ((
          value: Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>,
        ) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockImplementationOnce(
      async () =>
        await new Promise<typeof policyReviewQueueFixture>((resolve) => {
          resolvePolicyQueue = resolve;
        }),
    );
    getAdvisoryPolicyEvaluationMock.mockImplementationOnce(
      async () =>
        await new Promise<
          Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>
        >((resolve) => {
          resolvePolicyEvaluation = resolve;
        }),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Loading suitability reviews",
      }),
    ).toBeInTheDocument();

    await act(async () => {
      resolvePolicyQueue?.(policyReviewQueueFixture);
    });
    await waitFor(() => {
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_001");
    });
    expect(
      screen.getByRole("heading", { name: "Loading suitability reviews" }),
    ).toBeInTheDocument();

    await act(async () => {
      resolvePolicyEvaluation?.({
        ...policyReviewQueueFixture.items[0],
        evaluation_hash: "sha256:policy-evaluation-1",
        source_refs: [
          "lotus-core:core_product_eligibility_target_market_complexity",
        ],
        evaluation_json: { rule_results: [] },
      });
    });

    expect(
      await screen.findAllByRole("heading", {
        name: "Complete required approval review.",
      }),
    ).not.toHaveLength(0);
    expect(
      screen.getByText("Authoritative suitability policy record"),
    ).toBeInTheDocument();
  });

  it("keeps cached policy evidence visible while its source refreshes", async () => {
    let resolveWorkflowRefresh:
      | ((
          value: Awaited<ReturnType<typeof getAdvisoryPolicyWorkflowMock>>,
        ) => void)
      | undefined;

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByText("Request more evidence"),
    ).toBeInTheDocument();
    getAdvisoryPolicyWorkflowMock.mockImplementationOnce(
      async () =>
        await new Promise<
          Awaited<ReturnType<typeof getAdvisoryPolicyWorkflowMock>>
        >((resolve) => {
          resolveWorkflowRefresh = resolve;
        }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Request more evidence" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Refreshing suitability evidence",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Refreshing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "PRP-RISK",
      }),
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
      await screen.findAllByRole("heading", {
        name: "Complete required approval review.",
      }),
    ).not.toHaveLength(0);
    expect(
      screen.getByText("Authoritative suitability policy record"),
    ).toBeInTheDocument();
  });

  it("keeps cached policy evidence visible but marks a failed refresh partial", async () => {
    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByText("Request more evidence"),
    ).toBeInTheDocument();
    getAdvisoryPolicyWorkflowMock.mockRejectedValueOnce(
      new Error("refresh unavailable"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request more evidence" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Suitability evidence refresh failed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The latest suitability evidence refresh did not complete.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The prior evidence remains visible but is not confirmed current.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "PRP-RISK",
      }),
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
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByText("No suitability reviews need attention"),
    ).toBeInTheDocument();
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(
      new Error("policy refresh unavailable"),
    );

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["advisory-policy-review-queue", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(
      await screen.findByText("Suitability review worklist is unconfirmed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Retry before concluding that no evaluations need review/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No suitability reviews need attention"),
    ).not.toBeInTheDocument();
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
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("option", {
        name: /Technology concentration trim/,
      }),
    ).toBeInTheDocument();
    listProposalsMock.mockRejectedValueOnce(
      new Error("proposal refresh unavailable"),
    );

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["proposal-lifecycle-workspace", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(
      await screen.findByRole("heading", {
        name: "Proposal view is incomplete",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The latest proposal view could not be confirmed."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Retry the proposal view before relying/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "The latest policy-evidence refresh did not complete.",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps policy evidence hidden when its source denies access", async () => {
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(
      new Error(
        'Policy queue failed (403): {"detail":"portfolio access denied"}',
      ),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Suitability reviews are restricted",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your current role does not permit this portfolio's suitability review worklist to be viewed.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
  });

  it("keeps the shared suitability posture restricted when selected evidence denies access", async () => {
    getAdvisoryPolicyEvaluationMock.mockRejectedValueOnce(
      new Error(
        'Policy evaluation failed (403): {"detail":"evaluation access denied"}',
      ),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Suitability evidence access is unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Suitability reviews are restricted",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Source current")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request more evidence" }),
    ).not.toBeInTheDocument();
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
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByText("Selected suitability evidence is unconfirmed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The selected proposal and its supporting policy evidence do not agree. No review request is available until the source package is refreshed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request more evidence" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findAllByRole("heading", {
        name: "Selected suitability evidence is unconfirmed",
      }),
    ).not.toHaveLength(0);
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
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="suitability"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByText("Selected suitability evidence is unconfirmed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request more evidence" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findAllByRole("heading", {
        name: "Selected suitability evidence is unconfirmed",
      }),
    ).not.toHaveLength(0);
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
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    expect(
      await screen.findByText("Selected suitability evidence is unconfirmed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request more evidence" }),
    ).not.toBeInTheDocument();
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
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    expect(
      await screen.findByText("Selected suitability evidence is unconfirmed"),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /PRP-RISK/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "Request more evidence" }),
    ).not.toBeInTheDocument();
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
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="approval-queue"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "More proposals available" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 proposals in current view")).toBeInTheDocument();
    expect(
      screen.getByText("No matching proposals in this view"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No proposals in the approval queue"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next proposals" }));

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenLastCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: "cursor-window-2",
      });
    });
    expect(
      await screen.findByRole("option", {
        name: /Technology concentration trim/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "1 decision is not approved",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal view 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous proposals" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Next proposals" }),
    ).toBeDisabled();
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
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="approval-queue"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Next proposals" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Proposal information is unavailable",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous proposals" }));

    expect(
      await screen.findByRole("heading", { name: "More proposals available" }),
    ).toBeInTheDocument();
  });

  it("publishes restricted posture for proposal API authorization responses with response detail", async () => {
    listProposalsMock.mockRejectedValueOnce(
      new Error(
        'Proposal list failed (403): {"detail":"portfolio access denied"}',
      ),
    );

    renderWithQueryClient(
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
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proposal information is restricted",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Restricted")).toBeInTheDocument();
    expect(
      screen.queryByText("Proposal information is unavailable"),
    ).not.toBeInTheDocument();
  });

  it("does not show fallback rows when lifecycle data is unavailable", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByText(
        "Proposal lifecycle is unavailable. No fallback proposal queue is shown.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Proposal lifecycle unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Technology concentration trim"),
    ).not.toBeInTheDocument();
  });

  it("preserves review context in builder actions and discloses unsupported worklist selectors", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-04-10",
          period: "YTD",
          reportingCurrency: "SGD",
        }}
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Build Proposal" }),
    ).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD",
    );
    expect(
      screen.getByRole("complementary", { name: "Proposal worklist scope" }),
    ).toHaveTextContent(
      "The carried advisor review date 10 Apr 2026, review period YTD, and reporting currency SGD remain available across the wider review, but they do not filter this proposal worklist.",
    );
  });

  it("preserves review context in the empty-worklist builder action", async () => {
    listProposalsMock.mockResolvedValueOnce({ items: [], next_cursor: null });
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-04-10",
          period: "YTD",
          reportingCurrency: "SGD",
        }}
        mode="approval-queue"
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Build proposal" }),
    ).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD",
    );
  });

  it("renders Gateway-backed suitability policy evaluations without raw policy payload language", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-04-10",
          period: "YTD",
          reportingCurrency: "SGD",
        }}
        mode="suitability"
      />,
    );

    await waitFor(() => {
      expect(getAdvisoryPolicyReviewQueueMock).toHaveBeenCalledWith({
        evaluationStatus: "PENDING_REVIEW",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_001");
      expect(getAdvisoryPolicySignOffPackageMock).toHaveBeenCalledWith(
        "pev_001",
      );
      expect(getAdvisoryPolicyWorkflowMock).toHaveBeenCalledWith("pev_001");
    });

    expect(listProposalsMock).not.toHaveBeenCalled();

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Adviser decision worklist",
      }),
    ).toBeInTheDocument();
    const policyCounts = screen.getByLabelText("Suitability review counts");
    expect(within(policyCounts).getByText("In review")).toBeInTheDocument();
    expect(within(policyCounts).getByText("Needs action")).toBeInTheDocument();
    expect(within(policyCounts).getAllByText("1")).toHaveLength(2);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "PRP-RISK" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full proposal" }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD&fromMode=suitability",
    );
    expect(screen.getAllByText("Review required")).toHaveLength(3);
    expect(screen.getByText("Sign-off pending")).toBeInTheDocument();
    expect(
      screen.getByText("1 approval dependency, 1 disclosure review"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Complete required approval review."),
    ).toHaveLength(2);
    expect(screen.getByText("Source package available")).toBeInTheDocument();
    expect(screen.getByText("Client publication blocked")).toBeInTheDocument();
    expect(
      screen.getByText("Independent checker required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Within review deadline, 2 open"),
    ).toBeInTheDocument();
    expect(screen.getByText("Request more evidence")).toBeInTheDocument();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(
      screen.queryByText("advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("advisory-policy-evaluations"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("DISCLOSURE_REQUIREMENT_OPEN"),
    ).not.toBeInTheDocument();
  });

  it("confirms a manual suitability refresh only after every selected source succeeds", async () => {
    let resolveWorkflowRefresh:
      ((value: AdvisoryPolicyWorkflowData) => void) | undefined;

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: "Refresh source evidence",
    });
    getAdvisoryPolicyWorkflowMock.mockImplementationOnce(
      async () =>
        await new Promise<AdvisoryPolicyWorkflowData>((resolve) => {
          resolveWorkflowRefresh = resolve;
        }),
    );

    refreshButton.focus();
    fireEvent.click(refreshButton);

    const refreshStatus = await screen.findByTestId("workbench-refresh-status");
    expect(refreshStatus).toHaveAttribute("data-state", "pending");
    expect(
      within(refreshStatus).queryByText("Suitability evidence refreshed"),
    ).not.toBeInTheDocument();
    expect(getAdvisoryPolicyReviewQueueMock).toHaveBeenCalledTimes(2);
    expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledTimes(2);
    expect(getAdvisoryPolicySignOffPackageMock).toHaveBeenCalledTimes(2);
    expect(getAdvisoryPolicyWorkflowMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveWorkflowRefresh?.(policyWorkflowFixture);
    });

    await waitFor(() =>
      expect(refreshStatus).toHaveAttribute("data-state", "confirmed"),
    );
    expect(
      within(refreshStatus).getByText("Suitability evidence refreshed"),
    ).toBeInTheDocument();
    await waitFor(() => expect(refreshButton).toHaveFocus());
  });

  it("keeps evidence and actions bound to the explicitly selected review", async () => {
    let resolveFirstEvaluation:
      | ((
          value: Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>,
        ) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({
      items: [...policyReviewQueueFixture.items, secondPolicyReviewFixture],
    });
    getAdvisoryPolicyEvaluationMock.mockImplementation(
      async (evaluationId: string) => {
        if (evaluationId === "pev_001") {
          return await new Promise<
            Awaited<ReturnType<typeof getAdvisoryPolicyEvaluationMock>>
          >((resolve) => {
            resolveFirstEvaluation = resolve;
          });
        }
        return {
          ...secondPolicyReviewFixture,
          evaluation_hash: "sha256:policy-evaluation-2",
          source_refs: ["lotus-core:client_mandate_income_objective"],
          evaluation_json: {
            rule_results: [{ rule_id: "INCOME_OBJECTIVE", status: "READY" }],
          },
        };
      },
    );
    getAdvisoryPolicySignOffPackageMock.mockImplementation(
      async (evaluationId: string) => ({
        package_posture: {
          sign_off_source_package: "AVAILABLE",
          client_ready_publication: "BLOCKED",
        },
        lineage: {
          evaluation_id: evaluationId,
          audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
          lineage_posture: { client_ready_publication: "BLOCKED" },
        },
      }),
    );
    getAdvisoryPolicyWorkflowMock.mockImplementation(
      async (evaluationId: string) => ({
        evaluation_id: evaluationId,
        sign_off_status: "PENDING_REVIEW",
        sign_off_blockers:
          evaluationId === "pev_002" ? ["CLIENT_CONSENT_REQUIRED"] : [],
        maker_checker_required: true,
        sla_posture: { status: "WITHIN_SLA", open_requirement_count: 1 },
        client_ready_publication: "BLOCKED",
      }),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    const firstReview = await screen.findByRole("option", {
      name: /PRP-RISK/i,
    });
    const secondReview = screen.getByRole("option", { name: /PRP-INCOME/i });
    expect(firstReview).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(firstReview, { key: "ArrowDown" });

    await waitFor(() => {
      expect(secondReview).toHaveAttribute("aria-selected", "true");
      expect(getAdvisoryPolicyEvaluationMock).toHaveBeenCalledWith("pev_002");
      expect(getAdvisoryPolicySignOffPackageMock).toHaveBeenCalledWith(
        "pev_002",
      );
      expect(getAdvisoryPolicyWorkflowMock).toHaveBeenCalledWith("pev_002");
    });
    const selectedReview = screen.getByRole("region", {
      name: "Selected suitability review",
    });
    expect(
      await within(selectedReview).findByRole("heading", {
        name: "PRP-INCOME",
      }),
    ).toBeInTheDocument();
    expect(
      within(selectedReview).getByText("Source evidence complete"),
    ).toBeInTheDocument();

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
      within(selectedReview).getByRole("heading", {
        name: "PRP-INCOME",
      }),
    ).toBeInTheDocument();
    expect(
      within(selectedReview).queryByText("1 evidence gap"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(selectedReview).getByRole("button", {
        name: "Request more evidence",
      }),
    );
    await waitFor(() => {
      expect(recordAdvisoryPolicySignOffDecisionMock).toHaveBeenCalledWith(
        "pev_002",
        expect.objectContaining({
          body: expect.objectContaining({
            decision: "REQUEST_MORE_EVIDENCE",
            source_evaluation_hash: "sha256:policy-evaluation-2",
          }),
        }),
        expect.stringMatching(/^ui-policy-review-request-pev_002-\d+$/),
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
    getAdvisoryPolicyEvaluationMock.mockImplementation(
      async (evaluationId: string) => {
        const record =
          evaluationId === "pev_002"
            ? secondPolicyReviewFixture
            : policyReviewQueueFixture.items[0];
        return {
          ...record,
          evaluation_hash: `sha256:policy-evaluation-${evaluationId}`,
        };
      },
    );

    const { queryClient } = renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    const firstReview = await screen.findByRole("option", {
      name: /PRP-RISK/i,
    });
    expect(firstReview).toHaveAttribute("aria-selected", "true");

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["advisory-policy-review-queue", "PB_SG_GLOBAL_BAL_001"],
      });
    });

    expect(screen.getByRole("option", { name: /PRP-RISK/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: /PRP-INCOME/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(getAdvisoryPolicyEvaluationMock).not.toHaveBeenCalledWith("pev_002");
  });

  it("does not publish a completed request against a newly selected review", async () => {
    let resolveFirstRequest:
      | ((
          value: Awaited<
            ReturnType<typeof recordAdvisoryPolicySignOffDecisionMock>
          >,
        ) => void)
      | undefined;
    getAdvisoryPolicyReviewQueueMock.mockResolvedValueOnce({
      items: [...policyReviewQueueFixture.items, secondPolicyReviewFixture],
    });
    getAdvisoryPolicyEvaluationMock.mockImplementation(
      async (evaluationId: string) => {
        const record =
          evaluationId === "pev_002"
            ? secondPolicyReviewFixture
            : policyReviewQueueFixture.items[0];
        return {
          ...record,
          evaluation_hash: `sha256:policy-evaluation-${evaluationId === "pev_002" ? "2" : "1"}`,
          source_refs: ["lotus-core:governed_policy_source"],
          evaluation_json: {
            rule_results: [{ rule_id: "MANDATE_ALIGNMENT", status: "READY" }],
          },
        };
      },
    );
    recordAdvisoryPolicySignOffDecisionMock.mockImplementationOnce(
      async () =>
        await new Promise<
          Awaited<ReturnType<typeof recordAdvisoryPolicySignOffDecisionMock>>
        >((resolve) => {
          resolveFirstRequest = resolve;
        }),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Request more evidence" }),
    );
    expect(
      await screen.findByRole("button", { name: "Recording request..." }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("option", { name: /PRP-INCOME/i }));
    const selectedReview = screen.getByRole("region", {
      name: "Selected suitability review",
    });
    expect(
      await within(selectedReview).findByRole("heading", {
        name: "PRP-INCOME",
      }),
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
        "Evidence review request recorded through the advisory policy workflow.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(selectedReview).getByText(
        "Records a review request only; it does not approve sign-off or client publication.",
      ),
    ).toBeInTheDocument();
  });

  it("records bounded policy evidence review requests through Gateway only", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Request more evidence" }),
    );

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
        expect.stringMatching(/^ui-policy-review-request-pev_001-\d+$/),
      );
    });

    expect(
      await screen.findByText(
        "Evidence review request recorded through the advisory policy workflow.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("APPROVE_FOR_POLICY_SIGN_OFF"),
    ).not.toBeInTheDocument();
  });

  it("does not show fallback policy evaluations when the suitability queue is unavailable", async () => {
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="suitability"
      />,
    );

    expect(
      await screen.findByText(
        "Suitability review worklist is unavailable. No fallback suitability worklist is shown.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Suitability review worklist is unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
  });

  it("renders a source-backed discussion worklist and keeps client controls independent", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          created_by: "advisor-7",
          title: "Rebalance concentrated technology exposure",
        },
        {
          proposal_id: "proposal-2",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 1,
          created_at: "2026-08-21T10:00:00Z",
          created_by: "advisor-9",
          title: "Income mandate adjustment",
        },
      ],
      next_cursor: null,
    });
    getProposalDiscussionPackMock.mockImplementation(
      async (proposalId: string, _portfolioId: string, versionNo: number) => {
        const fixture = proposalDiscussionPackFixture();
        fixture.data.proposal_id = proposalId;
        fixture.data.version_no = versionNo;
        fixture.data.title =
          proposalId === "proposal-2"
            ? "Income mandate adjustment"
            : fixture.data.title;
        fixture.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";
        fixture.data.lineage.proposal_version_id = `${proposalId}:${versionNo}`;
        return fixture;
      },
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="discussion-pack"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Resolve the remaining client-discussion controls",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Approved for adviser use")).toHaveLength(2);
    expect(
      screen.getByText("No client consent is recorded for this version."),
    ).toBeInTheDocument();
    expect(screen.getByText("Client release and delivery")).toBeInTheDocument();
    expect(screen.getByText("Conversation opening")).toBeInTheDocument();
    expect(screen.getByText("How this was prepared")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /publish|deliver|contact client/i }),
    ).not.toBeInTheDocument();
    expect(listProposalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        state: "AWAITING_CLIENT_CONSENT",
      }),
    );
    expect(getProposalDiscussionPackMock).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("option", { name: /Income mandate adjustment/i }),
    );

    await waitFor(() => {
      expect(getProposalDiscussionPackMock).toHaveBeenLastCalledWith(
        "proposal-2",
        "PB_SG_GLOBAL_BAL_001",
        1,
        "AWAITING_CLIENT_CONSENT",
      );
    });
    expect(getProposalDiscussionPackMock).toHaveBeenCalledTimes(2);
  });

  it("keeps source refresh pending until the selected evidence succeeds and restores focus", async () => {
    listProposalsMock.mockResolvedValue({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          title: "Rebalance concentrated technology exposure",
        },
      ],
      next_cursor: null,
    });
    let completeRefresh:
      | ((value: ReturnType<typeof proposalDiscussionPackFixture>) => void)
      | undefined;
    getProposalDiscussionPackMock
      .mockResolvedValueOnce(proposalDiscussionPackFixture())
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof proposalDiscussionPackFixture>>(
            (resolve) => {
              completeRefresh = resolve;
            },
          ),
      );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    const refresh = await screen.findByRole("button", {
      name: "Refresh discussion pack",
    });
    refresh.focus();
    fireEvent.click(refresh);

    expect(
      await screen.findByText("Checking the current version"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Current version available"),
    ).not.toBeInTheDocument();

    await act(async () => {
      completeRefresh?.(proposalDiscussionPackFixture());
    });

    expect(
      await screen.findByText("Current version available"),
    ).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveFocus());
  });

  it("reconciles a refreshed proposal version before confirming conversation evidence", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "proposal-1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "AWAITING_CLIENT_CONSENT",
            current_version_no: 2,
            created_at: "2026-08-21T08:30:00Z",
            title: "Rebalance concentrated technology exposure",
          },
        ],
        next_cursor: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "proposal-1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "AWAITING_CLIENT_CONSENT",
            current_version_no: 3,
            created_at: "2026-08-21T08:30:00Z",
            title: "Rebalance concentrated technology exposure",
          },
        ],
        next_cursor: null,
      });
    getProposalDiscussionPackMock.mockImplementation(
      async (_proposalId: string, _portfolioId: string, versionNo: number) => {
        const fixture = proposalDiscussionPackFixture();
        fixture.data.version_no = versionNo;
        fixture.data.lineage.proposal_version_id = `proposal-1:${versionNo}`;
        return fixture;
      },
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    const refresh = await screen.findByRole("button", {
      name: "Refresh discussion pack",
    });
    fireEvent.click(refresh);

    expect(
      await screen.findByText("Current version available"),
    ).toBeInTheDocument();
    expect(getProposalDiscussionPackMock).toHaveBeenLastCalledWith(
      "proposal-1",
      "PB_SG_GLOBAL_BAL_001",
      3,
      "AWAITING_CLIENT_CONSENT",
    );
    expect(screen.getAllByText("Version 3").length).toBeGreaterThan(0);
  });

  it("publishes a complete-refresh failure to the shared workflow context", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "proposal-1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "AWAITING_CLIENT_CONSENT",
            current_version_no: 2,
            created_at: "2026-08-21T08:30:00Z",
            title: "Rebalance concentrated technology exposure",
          },
        ],
        next_cursor: null,
      })
      .mockRejectedValueOnce(new Error("Proposal list unavailable"));
    getProposalDiscussionPackMock.mockResolvedValueOnce(
      proposalDiscussionPackFixture(),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="discussion-pack"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Refresh discussion pack" }),
    );

    expect(await screen.findByText("Update failed")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "The latest supporting-evidence refresh did not complete.",
      ),
    ).toBeInTheDocument();
  });

  it("hides cached discussion evidence when worklist access is revoked", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "proposal-1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "AWAITING_CLIENT_CONSENT",
            current_version_no: 2,
            created_at: "2026-08-21T08:30:00Z",
            title: "Rebalance concentrated technology exposure",
          },
        ],
        next_cursor: null,
      })
      .mockRejectedValueOnce(
        new Error(
          'Proposal list failed (403): {"detail":"portfolio access denied"}',
        ),
      );
    getProposalDiscussionPackMock.mockResolvedValueOnce(
      proposalDiscussionPackFixture(),
    );

    renderWithQueryClient(
      <ProposalWorkflowContextProvider
        initialModel={buildNeutralProposalWorkflowContext({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          surfaceLabel: "Proposal lifecycle",
        })}
      >
        <ProposalLifecycleWorkspace
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mode="discussion-pack"
        />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(await screen.findByText("Conversation opening")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh discussion pack" }),
    );

    expect(
      await screen.findByText("Proposal access is not available"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conversation opening")).not.toBeInTheDocument();
    expect(screen.queryByText("How this was prepared")).not.toBeInTheDocument();
    expect(screen.queryByText("Decision summary")).not.toBeInTheDocument();
  });

  it("does not expose memo sections when source support is restricted", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          title: "Rebalance concentrated technology exposure",
        },
      ],
      next_cursor: null,
    });
    const restricted = proposalDiscussionPackFixture();
    restricted.data.overall_state = "partial";
    restricted.data.memo.state = "restricted";
    restricted.data.memo.reason_code = "advisor_memo_restricted";
    restricted.data.memo.memo_status = "READY";
    getProposalDiscussionPackMock.mockResolvedValueOnce(restricted);

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    expect(
      await screen.findByText(
        "No usable adviser memo is available for this proposal version.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Advisor-use rationale is recorded for the selected version.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(screen.getAllByText("Restricted").length).toBeGreaterThan(0);
  });

  it("withholds AI provenance when narrative support is restricted", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          title: "Rebalance concentrated technology exposure",
        },
      ],
      next_cursor: null,
    });
    const restricted = proposalDiscussionPackFixture();
    restricted.data.overall_state = "partial";
    restricted.data.narrative.state = "restricted";
    restricted.data.narrative.reason_code = "advisor_narrative_restricted";
    restricted.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";
    const hiddenNarrative = restricted.data.narrative.sections[0]!.text;
    const hiddenReviewer = restricted.data.narrative.reviewed_by!;
    const hiddenBlocker = restricted.data.narrative.client_ready_blockers[0]!;
    const hiddenLimitation = restricted.data.narrative.limitations[0]!.message;
    getProposalDiscussionPackMock.mockResolvedValueOnce(restricted);

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    expect(
      await screen.findByText("Conversation narrative is unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("AI-assisted draft")).not.toBeInTheDocument();
    expect(screen.queryByText("How this was prepared")).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenNarrative)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenReviewer)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenBlocker)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenLimitation)).not.toBeInTheDocument();
  });

  it("withholds policy text when disclosure support is restricted", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          title: "Rebalance concentrated technology exposure",
        },
      ],
      next_cursor: null,
    });
    const restricted = proposalDiscussionPackFixture();
    restricted.data.overall_state = "partial";
    const policyCapability = restricted.data.capabilities.find(
      ({ key }) => key === "disclosure_policy",
    )!;
    policyCapability.state = "restricted";
    policyCapability.reason_code = "disclosure_policy_restricted";
    const hiddenPolicyText = restricted.data.narrative.disclosures[0]!.text;
    const hiddenPolicyBlocker =
      restricted.data.narrative.client_ready_blockers[0]!;
    const hiddenPolicyLimitation =
      restricted.data.narrative.limitations[0]!.message;
    getProposalDiscussionPackMock.mockResolvedValueOnce(restricted);

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    expect(
      await screen.findByText("Disclosure requirements unavailable"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Disclosure requirements unavailable"));
    expect(
      screen.getByText(
        "Policy wording is withheld because disclosure requirements are unavailable for this proposal version.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(hiddenPolicyText)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenPolicyBlocker)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenPolicyLimitation)).not.toBeInTheDocument();
  });

  it("shows an explicit failure instead of inferring discussion readiness", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "proposal-1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "AWAITING_CLIENT_CONSENT",
          current_version_no: 2,
          created_at: "2026-08-21T08:30:00Z",
          title: "Rebalance concentrated technology exposure",
        },
      ],
      next_cursor: null,
    });
    getProposalDiscussionPackMock.mockRejectedValueOnce(
      new Error("Gateway unavailable"),
    );

    renderWithQueryClient(
      <ProposalLifecycleWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mode="discussion-pack"
      />,
    );

    expect(
      await screen.findByText("Discussion pack is unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry discussion pack" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Meeting material is ready for internal use"),
    ).not.toBeInTheDocument();
  });
});
