import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalDetailView from "../../src/features/proposals/components/proposal-detail-view";

const {
  createProposalVersionMock,
  getProposalMock,
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
  function proposalDetail(state = "DRAFT", proposalId = "pp-1") {
    return {
      proposal: {
        proposal_id: proposalId,
        current_state: state,
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

  function renderWithQueryClient(proposalId = "pp-1") {
    const queryClient = new QueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId={proposalId} />
      </QueryClientProvider>
    );
  }

  it("renders timeline and approvals", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Review history")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Risk review")).toBeInTheDocument();
    expect(screen.getByText(/Risk 1/)).toBeInTheDocument();
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
  });

  it("submits draft to risk review", async () => {
    getProposalMock
      .mockResolvedValueOnce(proposalDetail("DRAFT"))
      .mockResolvedValueOnce(proposalDetail("RISK_REVIEW"));
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit for risk review" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit for risk review" }));

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

  it("prevents duplicate submission while the source action is pending", async () => {
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
    fireEvent.click(action);
    fireEvent.click(action);

    expect(submitProposalMock).toHaveBeenCalledTimes(previousCallCount + 1);
    await waitFor(() => expect(action).toBeDisabled());
    completeSubmission?.();
    await screen.findByTestId("proposal-action-status");
  });

  it("keeps mutation failure explicit without exposing the raw downstream response", async () => {
    submitProposalMock.mockRejectedValueOnce(
      new Error("Proposal request failed (500): internal downstream detail")
    );
    renderWithQueryClient();

    fireEvent.click(await screen.findByRole("button", { name: "Submit for risk review" }));

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

    fireEvent.click(await screen.findByRole("button", { name: "Submit for risk review" }));

    expect(
      await screen.findByText(
        "The source action completed, but the refreshed review evidence could not be confirmed. Reload the proposal before continuing."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-action-status")).not.toBeInTheDocument();
  });

  it("approves risk when in risk review", async () => {
    getProposalMock.mockResolvedValueOnce({
      proposal: {
        proposal_id: "pp-1",
        current_state: "RISK_REVIEW",
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
          allocation_comparison: [],
        },
        simulate_request: {
          body: {
            options: { enable_proposal_simulation: true },
            proposed_trades: [],
          },
        },
      },
    });

    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve risk review" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve risk review" }));

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
    getProposalMock.mockResolvedValueOnce({
      proposal: {
        proposal_id: "pp-1",
        current_state: "AWAITING_CLIENT_CONSENT",
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
          allocation_comparison: [],
        },
        simulate_request: {
          body: {
            options: { enable_proposal_simulation: true },
            proposed_trades: [],
          },
        },
      },
    });

    renderWithQueryClient();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Record client consent" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Record client consent" }));

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
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create next version" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create next version" }));

    await waitFor(() => {
      expect(createProposalVersionMock).toHaveBeenCalled();
    });
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
    expect(screen.getByText("Review evidence partially available")).toBeInTheDocument();
    expect(screen.getByText(/Workflow history could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByText("Proposed changes")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("switches between preserved narrative and memo review panels with true tabs", async () => {
    renderWithQueryClient();

    const memoTab = await screen.findByRole("tab", { name: "Memo & evidence pack" });
    fireEvent.click(memoTab);

    expect(memoTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Narrative review" })).toHaveAttribute("aria-selected", "false");
    expect(await screen.findByRole("heading", { name: "Advisor Memo And Evidence Pack" })).toBeVisible();
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
    fireEvent.click(screen.getByRole("tab", { name: "Memo & evidence pack" }));
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
    expect(screen.getByRole("tab", { name: "Narrative review" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("proposal-evidence-disclosure")).not.toHaveAttribute("open");
  });
});
