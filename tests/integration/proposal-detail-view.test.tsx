import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalDetailView from "../../src/features/proposals/components/proposal-detail-view";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const {
  createProposalVersionMock,
  getProposalMock,
  getProposalVersionMock,
  submitProposalMock,
  approveRiskMock,
  approveComplianceMock,
  recordClientConsentMock,
  getWorkflowEventsMock,
  getApprovalsMock,
  getLineageMock,
  getProposalMemoMock,
  getProposalMemoProjectionMock,
  getProposalMemoLineageMock,
  getProposalMemoReplayEvidenceMock,
  createProposalMemoMock,
  reviewProposalMemoMock,
  requestProposalMemoReportPackageMock,
  requestProposalMemoAdvisorCommentaryMock,
} = vi.hoisted(() => ({
  createProposalVersionMock: vi.fn(async () => ({
    data: {
      proposal: {
        proposal_id: "pp-1",
        current_state: "DRAFT",
        current_version_no: 2,
      },
      version: {
        proposal_version_id: "ppv-2",
        proposal_id: "pp-1",
        version_no: 2,
      },
      latest_workflow_event: {
        event_id: "pwe_2",
        event_type: "NEW_VERSION_CREATED",
        to_state: "DRAFT",
        actor_id: "advisor_1",
        occurred_at: "2026-02-22T00:01:00Z",
      },
    },
  })),
  getProposalMock: vi.fn(async () => ({
    proposal: {
      proposal_id: "pp-1",
      current_state: "DRAFT",
      portfolio_id: "pf_1",
      current_version_no: 1,
    },
    current_version: {
      artifact_hash: "sha256:artifact-001",
      evidence_bundle: {
        generated_at: "2026-02-22T00:02:00Z",
        hashes: {
          request_hash: "sha256:request-001",
          simulation_hash: "sha256:simulation-001",
          artifact_hash: "sha256:artifact-001",
        },
        allocation_comparison: [
          { label: "Global Equities", current: "65.2%", proposed: "60.0%" },
          { label: "Fixed Income", current: "28.4%", proposed: "35.0%" },
        ],
      },
      simulate_request: {
        body: {
          options: { enable_proposal_simulation: true },
          proposed_trades: [
            {
              intent_type: "SECURITY_TRADE",
              side: "BUY",
              instrument_id: "VTI",
              quantity: "450.0000",
            },
            {
              intent_type: "SECURITY_TRADE",
              side: "SELL",
              instrument_id: "AAPL",
              quantity: "200.0000",
            },
          ],
        },
      },
    },
  })),
  getProposalVersionMock: vi.fn(async () => ({
    proposal_id: "pp-1",
    version_no: 1,
    status_at_creation: "DRAFT",
    created_at: "2026-02-22T00:00:00Z",
    artifact_hash: "sha256:artifact-001",
  })),
  submitProposalMock: vi.fn(async () => ({ data: { current_state: "RISK_REVIEW" } })),
  approveRiskMock: vi.fn(async () => ({ data: { current_state: "AWAITING_CLIENT_CONSENT" } })),
  approveComplianceMock: vi.fn(async () => ({ data: { current_state: "AWAITING_CLIENT_CONSENT" } })),
  recordClientConsentMock: vi.fn(async () => ({ data: { current_state: "EXECUTION_READY" } })),
  getWorkflowEventsMock: vi.fn(async () => ({
    proposal_id: "pp-1",
    current_state: "DRAFT",
    events: [
      {
        event_id: "pwe_1",
        event_type: "CREATED",
        from_state: null,
        to_state: "DRAFT",
        actor_id: "advisor_1",
        occurred_at: "2026-02-22T00:00:00Z",
      },
    ],
  })),
  getApprovalsMock: vi.fn(async () => ({
    proposal_id: "pp-1",
    current_state: "DRAFT",
    approvals: [
      {
        approval_id: "pap_1",
        approval_type: "RISK",
        approved: true,
        actor_id: "risk_1",
        occurred_at: "2026-02-22T00:00:01Z",
      },
    ],
  })),
  getLineageMock: vi.fn(async () => ({
    proposal_id: "pp-1",
    versions: [
      {
        version_no: 1,
        request_hash: "rh_1",
        simulation_hash: "sh_1",
        artifact_hash: "ah_1",
      },
    ],
  })),
  getProposalMemoMock: vi.fn(async () => ({
    memo_id: "memo_1",
    memo_status: "APPROVED_FOR_ADVISOR_USE",
    memo_hash: "sha256:memo-001",
    review_posture: { advisor_use: "APPROVED_FOR_ADVISOR_USE" },
    report_package_posture: { status: "READY" },
    ai_commentary_posture: { status: "AVAILABLE" },
    read_posture: { supportability: "SUPPORTED_ADVISOR_USE" },
  })),
  getProposalMemoProjectionMock: vi.fn(async () => ({
    projection: { audience: "ADVISOR", client_ready_publication: "BLOCKED" },
    projection_posture: { supportability: "SUPPORTED_ADVISOR_USE" },
  })),
  getProposalMemoLineageMock: vi.fn(async () => ({
    memos: [{ memo_hash: "sha256:memo-001", memo_status: "APPROVED_FOR_ADVISOR_USE" }],
  })),
  getProposalMemoReplayEvidenceMock: vi.fn(async () => ({
    hashes: { memo_hash: "sha256:memo-001" },
    supportability: { client_ready_publication: "BLOCKED" },
  })),
  createProposalMemoMock: vi.fn(async () => ({ memo_hash: "sha256:memo-001" })),
  reviewProposalMemoMock: vi.fn(async () => ({ memo_hash: "sha256:memo-001" })),
  requestProposalMemoReportPackageMock: vi.fn(async () => ({ report: { status: "READY" } })),
  requestProposalMemoAdvisorCommentaryMock: vi.fn(async () => ({
    commentary: { authority: "NON_AUTHORITATIVE" },
  })),
}));

vi.mock("../../src/features/proposals/api", () => ({
  createProposalVersion: createProposalVersionMock,
  getProposal: getProposalMock,
  getProposalVersion: getProposalVersionMock,
  submitProposal: submitProposalMock,
  approveRisk: approveRiskMock,
  approveCompliance: approveComplianceMock,
  recordClientConsent: recordClientConsentMock,
  getProposalWorkflowEvents: getWorkflowEventsMock,
  getProposalApprovals: getApprovalsMock,
  getProposalLineage: getLineageMock,
  createProposalMemo: createProposalMemoMock,
  getProposalMemo: getProposalMemoMock,
  getProposalMemoProjection: getProposalMemoProjectionMock,
  getProposalMemoLineage: getProposalMemoLineageMock,
  getProposalMemoReplayEvidence: getProposalMemoReplayEvidenceMock,
  reviewProposalMemo: reviewProposalMemoMock,
  requestProposalMemoReportPackage: requestProposalMemoReportPackageMock,
  requestProposalMemoAdvisorCommentary: requestProposalMemoAdvisorCommentaryMock,
}));

describe("ProposalDetailView", () => {
  function proposalDetail(state = "DRAFT", proposalId = "pp-1", currentVersionNo = 1) {
    return {
      proposal: {
        proposal_id: proposalId,
        current_state: state,
        portfolio_id: "pf_1",
        current_version_no: currentVersionNo,
      },
      current_version: {
        artifact_hash: "sha256:artifact-001",
        evidence_bundle: {
          generated_at: "2026-02-22T00:02:00Z",
          hashes: {
            request_hash: "sha256:request-001",
            simulation_hash: "sha256:simulation-001",
            artifact_hash: "sha256:artifact-001",
          },
          allocation_comparison: [],
        },
        simulate_request: {
          body: {
            options: { enable_proposal_simulation: true },
            proposed_trades: [],
          },
        },
      },
    };
  }

  function workflowEvidence(state = "DRAFT", proposalId = "pp-1") {
    return {
      proposal_id: proposalId,
      current_state: state,
      events: [
        {
          event_id: `event-${state}`,
          event_type: state === "DRAFT" ? "CREATED" : "SUBMITTED_FOR_REVIEW",
          from_state: null,
          to_state: state,
          actor_id: "advisor_1",
          occurred_at: "2026-02-22T00:00:00Z",
        },
      ],
    };
  }

  function approvalsEvidence(state = "DRAFT", proposalId = "pp-1") {
    return {
      proposal_id: proposalId,
      current_state: state,
      approvals: [],
    };
  }

  function lineageEvidence(proposalId = "pp-1", versionNo = 1) {
    return {
      proposal_id: proposalId,
      versions: [{
        version_no: versionNo,
        request_hash: "rh_1",
        simulation_hash: "sh_1",
        artifact_hash: "ah_1",
      }],
    };
  }

  function prepareCoherentActionRefresh(nextState: string, initialState = "DRAFT") {
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence(initialState))
      .mockResolvedValueOnce(workflowEvidence(nextState));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence(initialState))
      .mockResolvedValueOnce(approvalsEvidence(nextState));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce(lineageEvidence());
  }

  function renderWithQueryClient(proposalId = "pp-1") {
    const queryClient = new QueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId={proposalId} />
      </QueryClientProvider>
    );
  }

  async function clickReadyButton(name: string) {
    const button = await screen.findByRole("button", { name });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    return button;
  }

  it("renders timeline and approvals", async () => {
    getWorkflowEventsMock.mockResolvedValueOnce({
      ...workflowEvidence(),
      events: [{
        ...workflowEvidence().events[0],
        actor_id: "svc_RiskOps_A7",
      }],
    });
    getApprovalsMock.mockResolvedValueOnce({
      ...approvalsEvidence(),
      approvals: [{
        approval_id: "pap_case_sensitive",
        approval_type: "RISK",
        approved: true,
        actor_id: "caseSensitive_Review_A7",
        occurred_at: "2026-02-22T00:00:01Z",
      }],
    });
    renderWithQueryClient();

    await screen.findByText("Created");

    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
    expect(screen.getByText("Risk review")).toBeInTheDocument();
    expect(screen.getByText(/svc_RiskOps_A7/)).toBeInTheDocument();
    expect(screen.getByText(/caseSensitive_Review_A7/)).toBeInTheDocument();
    expect(screen.queryByText(/Svc Riskops A7/)).not.toBeInTheDocument();
  });

  it("renders a dense advisor proposal workspace from Gateway proposal evidence", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Advisor proposal workspace" })).toBeInTheDocument();
    });

    expect(
      screen.getByText("Advisor use only. Client release requires source evidence and completed review gates.")
    ).toBeInTheDocument();
    expect(screen.getByText("VTI")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Global Equities")).toBeInTheDocument();
    expect(screen.getByText("65.2% → 60.0%")).toBeInTheDocument();
    expect(screen.getAllByText("sha256:artifact-001").length).toBeGreaterThan(0);
    expect(screen.getByText("Client-ready publication is not promoted from this Workbench surface.")).toBeInTheDocument();
    expect(screen.getByTestId("proposal-evidence-disclosure")).not.toHaveAttribute("open");
    expect(screen.getByRole("tab", { name: "Narrative review" })).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("proposal-narrative-review")).toBeVisible();
  });

  it("drops selectors from a different portfolio when returning to the source-owned worklist", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-1"
          returnPortfolioId="PB_QUERY_CONTEXT"
          returnReviewContext={{
            portfolioId: "PB_QUERY_CONTEXT",
            asOfDate: "2026-08-21",
            period: "YTD",
            reportingCurrency: "SGD",
          }}
          returnMode="risk-impact"
          returnSourceWindow={{
            cursor: "query-context-window-2",
            windowNumber: 2,
          }}
        />
      </QueryClientProvider>
    );

    const returnLink = await screen.findByRole("link", { name: "Return to Risk and Impact" });
    expect(returnLink).toHaveAttribute(
      "href",
      "/proposals?portfolioId=pf_1&mode=risk-impact"
    );
  });

  it("preserves selectors that belong to the source-owned proposal portfolio", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-1"
          returnPortfolioId="pf_1"
          returnReviewContext={{
            portfolioId: "pf_1",
            asOfDate: "2026-08-21",
            period: "YTD",
            reportingCurrency: "SGD",
          }}
          returnMode="risk-impact"
          returnSourceWindow={{
            cursor: "source-window-2",
            windowNumber: 2,
          }}
        />
      </QueryClientProvider>
    );

    expect(
      await screen.findByRole("link", { name: "Return to Risk and Impact" }),
    ).toHaveAttribute(
      "href",
      "/proposals?portfolioId=pf_1&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&mode=risk-impact&cursor=source-window-2&sourceWindow=2",
    );
  });

  it("returns Advisory Overview proposals to the originating decision worklist", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-1"
          returnPortfolioId="pf_1"
          returnReviewContext={{
            portfolioId: "pf_1",
            asOfDate: "2026-08-21",
            period: "YTD",
            reportingCurrency: "SGD",
          }}
          returnMode="overview"
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("link", { name: "Return to Advisory Overview" }),
    ).toHaveAttribute(
      "href",
      "/recommendations?portfolioId=pf_1&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD",
    );
  });

  it("preserves the originating worklist when proposal detail is unavailable", async () => {
    getProposalMock.mockRejectedValueOnce(
      new Error("Proposal detail failed (503): gateway unavailable"),
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-1"
          returnPortfolioId="PB_SG_GLOBAL_BAL_001"
          returnMode="approval-queue"
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proposal review could not be loaded",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Approval Queue" }),
    ).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001",
    );
  });

  it("does not invent a return portfolio when detail and address context are unavailable", async () => {
    getProposalMock.mockRejectedValueOnce(
      new Error("Proposal detail failed (503): gateway unavailable"),
    );
    renderWithQueryClient();

    expect(
      await screen.findByRole("heading", {
        name: "Proposal review could not be loaded",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open My book" })).toHaveAttribute(
      "href",
      "/book",
    );
  });

  it("keeps restricted proposal detail distinct and preserves return context", async () => {
    getProposalMock.mockRejectedValueOnce(
      new WorkbenchApiError("proposal detail", 403),
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-1"
          returnPortfolioId="PB_SG_GLOBAL_BAL_001"
          returnMode="approval-queue"
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proposal review is restricted",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no approval or workflow posture is inferred/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Approval Queue" }),
    ).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001",
    );
  });

  it("preserves the originating worklist when a proposal is not found", async () => {
    getProposalMock.mockRejectedValueOnce(
      new WorkbenchApiError("proposal detail", 404),
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView
          proposalId="pp-missing"
          returnPortfolioId="PB_SG_GLOBAL_BAL_001"
          returnReviewContext={{
            portfolioId: "PB_SG_GLOBAL_BAL_001",
            asOfDate: "2026-08-21",
            period: "YTD",
            reportingCurrency: "SGD",
          }}
          returnMode="approval-queue"
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Proposal Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Approval Queue" }),
    ).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD",
    );
    expect(
      screen.getByRole("link", { name: "Create New Proposal Draft" }),
    ).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD",
    );
  });

  it("does not expose a portfolio-bound draft action without a valid portfolio identity", () => {
    renderWithQueryClient("invalid proposal id");

    expect(
      screen.getByRole("heading", { name: "Invalid Proposal Identifier" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create New Proposal Draft" }),
    ).not.toBeInTheDocument();
  });

  it("submits draft to risk review", async () => {
    prepareCoherentActionRefresh("RISK_REVIEW");
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    renderWithQueryClient();

    const action = await screen.findByRole("button", { name: "Submit for risk review" });
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);

    await waitFor(() => {
      expect(submitProposalMock).toHaveBeenCalled();
    });
    expect(submitProposalMock).toHaveBeenCalledWith(
      "pp-1",
      expect.objectContaining({
        actor_id: "advisor_1",
        expected_state: "DRAFT",
        review_type: "RISK",
      }),
      expect.stringMatching(/^ui-submit-risk-pp-1-\d+$/)
    );
    await waitFor(() => {
      expect(screen.getByTestId("proposal-action-status")).toHaveTextContent(
        "Proposal submitted for risk review. Current posture: Risk team review is currently pending."
      );
    });
  });

  it("keeps proposal actions unavailable until initial review evidence settles", async () => {
    let completeWorkflowRead: (() => void) | undefined;
    getWorkflowEventsMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeWorkflowRead = () => resolve(workflowEvidence("DRAFT"));
      })
    ).mockResolvedValueOnce(workflowEvidence("RISK_REVIEW"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"))
      .mockResolvedValueOnce(approvalsEvidence("RISK_REVIEW"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce(lineageEvidence());
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));

    renderWithQueryClient();

    const action = await screen.findByRole("button", { name: "Submit for risk review" });
    const previousCallCount = submitProposalMock.mock.calls.length;
    expect(action).toBeDisabled();
    expect(screen.getByText("Checking current proposal evidence before actions are available.")).toBeInTheDocument();
    fireEvent.click(action);
    expect(submitProposalMock).toHaveBeenCalledTimes(previousCallCount);

    await act(async () => completeWorkflowRead?.());
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);

    await waitFor(() => expect(submitProposalMock).toHaveBeenCalledTimes(previousCallCount + 1));
    await screen.findByTestId("proposal-action-status");
  });

  it.each([
    {
      sourceConflict: "workflow posture",
      arrange: () => getWorkflowEventsMock.mockResolvedValueOnce(workflowEvidence("RISK_REVIEW")),
    },
    {
      sourceConflict: "approval proposal identity",
      arrange: () => getApprovalsMock.mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-2")),
    },
    {
      sourceConflict: "active version lineage",
      arrange: () => getLineageMock.mockResolvedValueOnce({
        ...lineageEvidence(),
        versions: [{
          version_no: 2,
          request_hash: "rh_2",
          simulation_hash: "sh_2",
          artifact_hash: "ah_2",
        }],
      }),
    },
  ])("keeps actions unavailable when initial $sourceConflict does not agree", async ({ arrange }) => {
    arrange();
    renderWithQueryClient();

    const action = await screen.findByRole("button", { name: "Submit for risk review" });
    const previousCallCount = submitProposalMock.mock.calls.length;
    await waitFor(() => expect(action).toBeDisabled());
    expect(
      screen.getByText(
        "Proposal actions are unavailable because current detail, workflow, approvals, and version lineage do not agree. Reload the proposal to continue."
      )
    ).toBeInTheDocument();

    fireEvent.click(action);
    expect(submitProposalMock).toHaveBeenCalledTimes(previousCallCount);
  });

  it("keeps actions unavailable until the active detail evidence mode settles", async () => {
    let completeDetailRead: (() => void) | undefined;
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          completeDetailRead = () => resolve(proposalDetail("DRAFT"));
        })
      );
    renderWithQueryClient();

    const action = await screen.findByRole("button", { name: "Submit for risk review" });
    fireEvent.click(screen.getByTestId("proposal-evidence-disclosure").querySelector("summary")!);
    const evidenceMode = screen.getByRole("switch", { name: "Load full evidence bundle" });
    const previousActionCount = submitProposalMock.mock.calls.length;

    await waitFor(() => expect(action).toBeEnabled());
    await waitFor(() => expect(evidenceMode).toBeEnabled());
    fireEvent.click(evidenceMode);
    await waitFor(() => expect(evidenceMode).toBeDisabled());
    fireEvent.click(action);

    expect(submitProposalMock).toHaveBeenCalledTimes(previousActionCount);
    await waitFor(() => expect(action).toBeDisabled());
    expect(
      screen.getByText("Checking current proposal evidence before actions are available.")
    ).toBeInTheDocument();

    await act(async () => completeDetailRead?.());
    await waitFor(() => expect(action).toBeEnabled());
    expect(evidenceMode).toBeEnabled();
  });

  it("prevents duplicate submission while the source action is pending", async () => {
    prepareCoherentActionRefresh("RISK_REVIEW");
    let completeSubmission: (() => void) | undefined;
    submitProposalMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeSubmission = () => resolve({ data: { current_state: "RISK_REVIEW" } });
      })
    );
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    renderWithQueryClient();

    const action = await screen.findByRole("button", { name: "Submit for risk review" });
    const previousCallCount = submitProposalMock.mock.calls.length;
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);
    fireEvent.click(action);

    expect(submitProposalMock).toHaveBeenCalledTimes(previousCallCount + 1);
    await waitFor(() => expect(action).toBeDisabled());
    await act(async () => completeSubmission?.());
    await screen.findByTestId("proposal-action-status");
  });

  it("does not publish success when refreshed sources disagree on proposal posture", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT"))
      .mockResolvedValueOnce(workflowEvidence("RISK_REVIEW"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"))
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce(lineageEvidence());

    renderWithQueryClient();
    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The source action returned review evidence that does not agree on the current proposal posture. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve risk review" })).toBeDisabled();
  });

  it("does not publish success when refreshed lineage omits the active version", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT"))
      .mockResolvedValueOnce(workflowEvidence("RISK_REVIEW"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"))
      .mockResolvedValueOnce(approvalsEvidence("RISK_REVIEW"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce({
        ...lineageEvidence(),
        versions: [{
          version_no: 2,
          request_hash: "rh_2",
          simulation_hash: "sh_2",
          artifact_hash: "ah_2",
        }],
      });

    renderWithQueryClient();
    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The source action returned lineage that does not confirm the active proposal version. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve risk review" })).toBeDisabled();
  });

  it("does not publish success when any refreshed source belongs to another proposal", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT"))
      .mockResolvedValueOnce(workflowEvidence("RISK_REVIEW"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"))
      .mockResolvedValueOnce(approvalsEvidence("RISK_REVIEW"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce(lineageEvidence("pp-2"));

    renderWithQueryClient();
    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The source action returned evidence for a different proposal. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
  });

  it("fences evidence-mode changes while an action and coherent refresh are pending", async () => {
    let completeSubmission: (() => void) | undefined;
    submitProposalMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeSubmission = () => resolve({ data: { current_state: "RISK_REVIEW" } });
      })
    );
    prepareCoherentActionRefresh("RISK_REVIEW");
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    renderWithQueryClient();

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    const evidenceMode = screen.getByRole("switch", { name: "Load full evidence bundle" });
    const createVersion = screen.getByRole("button", { name: "Create next version" });
    await clickReadyButton("Submit for risk review");

    await waitFor(() => expect(evidenceMode).toBeDisabled());
    expect(createVersion).toBeDisabled();
    fireEvent.click(evidenceMode);
    expect(evidenceMode).not.toBeChecked();

    await act(async () => completeSubmission?.());
    await screen.findByTestId("proposal-action-status");
    expect(evidenceMode).toBeEnabled();
  });

  it("fences proposal actions and detail-context controls during version creation", async () => {
    let completeVersionCreation: (() => void) | undefined;
    createProposalVersionMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeVersionCreation = () => resolve({
          data: {
            proposal: {
              proposal_id: "pp-1",
              current_state: "DRAFT",
              current_version_no: 2,
            },
            version: {
              proposal_version_id: "ppv-2",
              proposal_id: "pp-1",
              version_no: 2,
            },
            latest_workflow_event: {
              event_id: "pwe_2",
              event_type: "NEW_VERSION_CREATED",
              to_state: "DRAFT",
              actor_id: "advisor_1",
              occurred_at: "2026-02-22T00:01:00Z",
            },
          },
        });
      })
    );
    renderWithQueryClient();

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    const action = screen.getByRole("button", { name: "Submit for risk review" });
    const evidenceMode = screen.getByRole("switch", { name: "Load full evidence bundle" });
    const createVersion = screen.getByRole("button", { name: "Create next version" });
    const previousActionCount = submitProposalMock.mock.calls.length;

    await waitFor(() => expect(createVersion).toBeEnabled());
    fireEvent.click(createVersion);
    await waitFor(() => expect(action).toBeDisabled());
    expect(evidenceMode).toBeDisabled();
    expect(createVersion).toBeDisabled();
    fireEvent.click(action);
    expect(submitProposalMock).toHaveBeenCalledTimes(previousActionCount);

    await act(async () => completeVersionCreation?.());
    expect(await screen.findByText("Version created successfully: 2")).toBeInTheDocument();
    await waitFor(() => expect(action).toBeEnabled());
    expect(evidenceMode).toBeEnabled();
  });

  it("keeps mutation failure explicit without exposing the raw downstream response", async () => {
    submitProposalMock.mockRejectedValueOnce(
      new Error("Proposal request failed (500): internal downstream detail")
    );
    renderWithQueryClient();

    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The proposal action could not be completed. Review the current posture and try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/internal downstream detail/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
  });

  it("does not publish action success when refreshed review evidence fails", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT"))
      .mockRejectedValueOnce(new Error("workflow refresh failed"));
    renderWithQueryClient();

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    const createVersion = screen.getByRole("button", { name: "Create next version" });
    const previousVersionCount = createProposalVersionMock.mock.calls.length;

    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The source action completed, but the refreshed review evidence could not be confirmed. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve risk review" })).toBeDisabled();
    expect(
      screen.getByText(
        "Proposal actions remain unavailable because refreshed review evidence could not be confirmed. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(createVersion).toBeDisabled();
    fireEvent.click(createVersion);
    expect(createProposalVersionMock).toHaveBeenCalledTimes(previousVersionCount);
  });

  it("preserves cached proposal evidence when the confirmation detail refresh fails", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockRejectedValueOnce(new Error("proposal refresh failed: internal downstream detail"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT"))
      .mockResolvedValueOnce(workflowEvidence("RISK_REVIEW"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT"))
      .mockResolvedValueOnce(approvalsEvidence("RISK_REVIEW"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence())
      .mockResolvedValueOnce(lineageEvidence());
    renderWithQueryClient();

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    await clickReadyButton("Submit for risk review");

    expect(
      await screen.findByText(
        "The source action completed, but the refreshed review evidence could not be confirmed. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Proposal pp-1" })).toBeInTheDocument();
    expect(screen.getByText("Proposed changes")).toBeInTheDocument();
    expect(screen.queryByText(/internal downstream detail/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for risk review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create next version" })).toBeDisabled();
  });

  it("approves risk when in risk review", async () => {
    prepareCoherentActionRefresh("AWAITING_CLIENT_CONSENT", "RISK_REVIEW");
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"))
      .mockResolvedValueOnce(proposalDetail("AWAITING_CLIENT_CONSENT"));

    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve risk review" })).toBeInTheDocument();
    });

    await clickReadyButton("Approve risk review");

    await waitFor(() => {
      expect(approveRiskMock).toHaveBeenCalled();
    });
    expect(approveRiskMock).toHaveBeenCalledWith(
      "pp-1",
      expect.objectContaining({
        actor_id: "risk_officer_1",
        expected_state: "RISK_REVIEW",
      }),
      expect.stringMatching(/^ui-approve-risk-pp-1-\d+$/)
    );
  });

  it("records client consent when awaiting client consent", async () => {
    prepareCoherentActionRefresh("EXECUTION_READY", "AWAITING_CLIENT_CONSENT");
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("AWAITING_CLIENT_CONSENT"))
      .mockResolvedValueOnce(proposalDetail("EXECUTION_READY"));

    renderWithQueryClient();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Record client consent" })
      ).toBeInTheDocument();
    });

    await clickReadyButton("Record client consent");

    await waitFor(() => {
      expect(recordClientConsentMock).toHaveBeenCalled();
    });
    expect(recordClientConsentMock).toHaveBeenCalledWith(
      "pp-1",
      expect.objectContaining({
        actor_id: "advisor_1",
        expected_state: "AWAITING_CLIENT_CONSENT",
      }),
      expect.stringMatching(/^ui-record-client-consent-pp-1-\d+$/)
    );
  });

  it("reads current_version_no from the proposal envelope after creating a new version", async () => {
    let completeVersionCreation: (() => void) | undefined;
    createProposalVersionMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeVersionCreation = () => resolve({
          data: {
            proposal: {
              proposal_id: "pp-1",
              current_state: "DRAFT",
              current_version_no: 2,
            },
            version: {
              proposal_version_id: "ppv-2",
              proposal_id: "pp-1",
              version_no: 2,
            },
            latest_workflow_event: {
              event_id: "pwe_2",
              event_type: "NEW_VERSION_CREATED",
              to_state: "DRAFT",
              actor_id: "advisor_1",
              occurred_at: "2026-02-22T00:01:00Z",
            },
          },
        });
      })
    );
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create next version" })).toBeInTheDocument();
    });

    await clickReadyButton("Create next version");

    await waitFor(() => {
      expect(createProposalVersionMock).toHaveBeenCalled();
    });
    await act(async () => completeVersionCreation?.());
    await waitFor(() => {
      expect(screen.getByText("Version created successfully: 2")).toBeInTheDocument();
    });
  });

  it("keeps the proposal decision visible when ancillary workflow evidence fails", async () => {
    getWorkflowEventsMock.mockRejectedValueOnce(new Error("workflow unavailable"));

    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Advisor proposal workspace" })).toBeInTheDocument();
    });
    expect(await screen.findByText("Review evidence partially available")).toBeInTheDocument();
    expect(screen.getByText(/Workflow history could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByText("Proposed changes")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for risk review" })).toBeDisabled();
    expect(
      screen.getByText(
        "Proposal actions are unavailable until all review evidence can be confirmed. Reload the proposal to continue."
      )
    ).toBeInTheDocument();
  });

  it("keeps ancillary approval, lineage, and event facts pending until source reads settle", async () => {
    getWorkflowEventsMock.mockImplementationOnce(() => new Promise<never>(() => undefined));
    getApprovalsMock.mockImplementationOnce(() => new Promise<never>(() => undefined));
    getLineageMock.mockImplementationOnce(() => new Promise<never>(() => undefined));

    renderWithQueryClient();

    await screen.findByRole("region", { name: "Advisor proposal workspace" });
    expect(screen.getAllByText("Checking")).toHaveLength(5);
    expect(screen.queryByText("0 recorded")).not.toBeInTheDocument();
    expect(screen.queryByText("No events returned")).not.toBeInTheDocument();
    expect(screen.queryByText("Risk review remains required before execution.")).not.toBeInTheDocument();
    expect(screen.getByText("Checking source risk approval evidence.")).toBeInTheDocument();
    expect(screen.getByText("Checking source compliance approval evidence.")).toBeInTheDocument();
    expect(screen.getByText("Checking version lineage and review history")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("proposal-evidence-disclosure").querySelector("summary")!);
    expect(screen.getByText("Checking version lineage evidence.")).toBeInTheDocument();
    expect(screen.getByText("Checking workflow history.")).toBeInTheDocument();
    expect(screen.getByText("Checking approval history.")).toBeInTheDocument();
    expect(screen.queryByText("No workflow events.")).not.toBeInTheDocument();
    expect(screen.queryByText("No approvals recorded.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No lineage metadata returned for this proposal yet.")
    ).not.toBeInTheDocument();
  });

  it("switches between preserved narrative and memo review panels with true tabs", async () => {
    renderWithQueryClient();

    const memoTab = await screen.findByRole("tab", { name: "Memo & evidence pack" });
    fireEvent.click(memoTab);

    expect(memoTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Narrative review" })).toHaveAttribute("aria-selected", "false");
    expect(await screen.findByRole("heading", { name: "Advisor memo and evidence pack" })).toBeVisible();
  });

  it("abandons a version-creation completion after proposal identity changes", async () => {
    let completeVersionCreation: (() => void) | undefined;
    createProposalVersionMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeVersionCreation = () => resolve({
          data: {
            proposal: {
              proposal_id: "pp-1",
              current_state: "DRAFT",
              current_version_no: 2,
            },
            version: {
              proposal_version_id: "ppv-2",
              proposal_id: "pp-1",
              version_no: 2,
            },
            latest_workflow_event: {
              event_id: "pwe_2",
              event_type: "NEW_VERSION_CREATED",
              to_state: "DRAFT",
              actor_id: "advisor_1",
              occurred_at: "2026-02-22T00:01:00Z",
            },
          },
        });
      })
    );
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1"))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-2"));
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    await clickReadyButton("Create next version");
    await waitFor(() => expect(createProposalVersionMock).toHaveBeenCalled());

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-2" />
      </QueryClientProvider>
    );
    await act(async () => completeVersionCreation?.());

    await screen.findByRole("heading", { level: 1, name: "Proposal pp-2" });
    await waitFor(() => {
      expect(screen.queryByText("Version created successfully: 2")).not.toBeInTheDocument();
    });
  });

  it("resets review state and does not retain prior proposal detail when identity changes", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1"))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-2"));
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    await screen.findByRole("heading", { level: 1, name: "Proposal pp-1" });
    const previousMemoTab = screen.getByRole("tab", { name: "Memo & evidence pack" });
    fireEvent.click(previousMemoTab);
    previousMemoTab.focus();
    fireEvent.click(screen.getByTestId("proposal-evidence-disclosure").querySelector("summary")!);
    expect(screen.getByRole("tab", { name: "Memo & evidence pack" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("proposal-evidence-disclosure")).toHaveAttribute("open");

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-2" />
      </QueryClientProvider>
    );

    await screen.findByRole("heading", { level: 1, name: "Proposal pp-2" });
    expect(screen.queryByRole("heading", { level: 1, name: "Proposal pp-1" })).not.toBeInTheDocument();
    expect(previousMemoTab).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Narrative review" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("proposal-evidence-disclosure")).not.toHaveAttribute("open");
  });

  it("does not publish an earlier action completion after leaving and returning to a proposal", async () => {
    let completeSubmission: (() => void) | undefined;
    submitProposalMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeSubmission = () => resolve({ data: { current_state: "RISK_REVIEW" } });
      })
    );
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1"))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-2"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW", "pp-1"));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(workflowEvidence("DRAFT", "pp-2"))
      .mockResolvedValueOnce(workflowEvidence("RISK_REVIEW", "pp-1"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-2"))
      .mockResolvedValueOnce(approvalsEvidence("RISK_REVIEW", "pp-1"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence("pp-1"))
      .mockResolvedValueOnce(lineageEvidence("pp-2"))
      .mockResolvedValueOnce(lineageEvidence("pp-1"));
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    await clickReadyButton("Submit for risk review");
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-2" />
      </QueryClientProvider>
    );
    await screen.findByRole("heading", { level: 1, name: "Proposal pp-2" });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );
    await screen.findByRole("heading", { level: 1, name: "Proposal pp-1" });

    await act(async () => completeSubmission?.());

    await waitFor(() => {
      expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
    });
  });

  it("retains refreshed version evidence across proposal and route transitions", async () => {
    let completeVersionCreation: (() => void) | undefined;
    createProposalVersionMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeVersionCreation = () => resolve({
          data: {
            proposal: {
              proposal_id: "pp-1",
              current_state: "DRAFT",
              current_version_no: 2,
            },
            version: {
              proposal_version_id: "ppv-2",
              proposal_id: "pp-1",
              version_no: 2,
            },
            latest_workflow_event: {
              event_id: "pwe_2",
              event_type: "NEW_VERSION_CREATED",
              to_state: "DRAFT",
              actor_id: "advisor_1",
              occurred_at: "2026-02-22T00:01:00Z",
            },
          },
        });
      })
    );
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1", 1))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1", 2))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-2", 1));
    getWorkflowEventsMock
      .mockResolvedValueOnce(workflowEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(workflowEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(workflowEvidence("DRAFT", "pp-2"));
    getApprovalsMock
      .mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-1"))
      .mockResolvedValueOnce(approvalsEvidence("DRAFT", "pp-2"));
    getLineageMock
      .mockResolvedValueOnce(lineageEvidence("pp-1", 1))
      .mockResolvedValueOnce(lineageEvidence("pp-1", 2))
      .mockResolvedValueOnce(lineageEvidence("pp-2", 1));
    const proposalCallsBeforeTest = getProposalMock.mock.calls.length;
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    await clickReadyButton("Create next version");
    await waitFor(() => expect(createProposalVersionMock).toHaveBeenCalled());
    await act(async () => completeVersionCreation?.());
    await screen.findByText("Version created successfully: 2");
    await screen.findByText(/Portfolio pf_1 · Version 2/);

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-2" />
      </QueryClientProvider>
    );
    await screen.findByRole("heading", { level: 1, name: "Proposal pp-2" });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    await screen.findByRole("heading", { level: 1, name: "Proposal pp-1" });
    expect(screen.getByText(/Portfolio pf_1 · Version 2/)).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <div>Proposal queue</div>
      </QueryClientProvider>
    );
    expect(screen.queryByRole("heading", { level: 1, name: "Proposal pp-1" })).not.toBeInTheDocument();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    await screen.findByRole("heading", { level: 1, name: "Proposal pp-1" });
    expect(screen.getByText(/Portfolio pf_1 · Version 2/)).toBeInTheDocument();
    expect(getProposalMock.mock.calls.length - proposalCallsBeforeTest).toBe(3);
  });

  it("does not publish an earlier version lookup after leaving and returning to a proposal", async () => {
    let completeVersionLookup: (() => void) | undefined;
    getProposalVersionMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        completeVersionLookup = () => resolve({
          proposal_id: "pp-1",
          version_no: 9,
          status_at_creation: "DRAFT",
          created_at: "2026-02-22T00:00:00Z",
          artifact_hash: "sha256:old-version",
        });
      })
    );
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-1"))
      .mockResolvedValueOnce(proposalDetail("DRAFT", "pp-2"));
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );

    fireEvent.click((await screen.findByTestId("proposal-evidence-disclosure")).querySelector("summary")!);
    await clickReadyButton("Load version");
    await waitFor(() => expect(getProposalVersionMock).toHaveBeenCalled());
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-2" />
      </QueryClientProvider>
    );
    await screen.findByRole("heading", { level: 1, name: "Proposal pp-2" });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );
    await screen.findByRole("heading", { level: 1, name: "Proposal pp-1" });

    await act(async () => completeVersionLookup?.());

    await waitFor(() => {
      expect(screen.queryByText("Loaded Version 9")).not.toBeInTheDocument();
    });
  });
});
