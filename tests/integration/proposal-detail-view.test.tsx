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
  function renderWithQueryClient() {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalDetailView proposalId="pp-1" />
      </QueryClientProvider>
    );
  }

  it("renders timeline and approvals", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Review History")).toBeInTheDocument();
    });

    expect(screen.getAllByText("DRAFT").length).toBeGreaterThan(0);
    expect(screen.getByText(/CREATED/)).toBeInTheDocument();
    expect(screen.getByText("RISK")).toBeInTheDocument();
    expect(screen.getByText(/risk_1/)).toBeInTheDocument();
  });

  it("renders a dense advisor proposal workspace from Gateway proposal evidence", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Advisor proposal workspace" })).toBeInTheDocument();
    });

    expect(screen.getByText("Advisor use only - not client ready")).toBeInTheDocument();
    expect(screen.getByText("VTI")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Global Equities")).toBeInTheDocument();
    expect(screen.getByText("65.2% → 60.0%")).toBeInTheDocument();
    expect(screen.getAllByText("sha256:artifact-001").length).toBeGreaterThan(0);
    expect(screen.getByText("Client-ready publication is not promoted from this Workbench surface.")).toBeInTheDocument();
  });

  it("submits draft to risk review", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit To Risk Review" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit To Risk Review" }));

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
      expect(screen.getByRole("button", { name: "Approve Risk" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve Risk" }));

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
        screen.getByRole("button", { name: "Record Client Consent" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Record Client Consent" }));

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
      expect(screen.getByRole("button", { name: "Create Next Version" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Next Version" }));

    await waitFor(() => {
      expect(createProposalVersionMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("Version created successfully: 2")).toBeInTheDocument();
    });
  });
});
