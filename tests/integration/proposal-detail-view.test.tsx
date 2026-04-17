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
      simulate_request: {
        options: { enable_proposal_simulation: true },
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
      expect(screen.getByText("Current State")).toBeInTheDocument();
    });

    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText(/CREATED/)).toBeInTheDocument();
    expect(screen.getByText("RISK")).toBeInTheDocument();
    expect(screen.getByText(/risk_1/)).toBeInTheDocument();
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
        simulate_request: {
          options: { enable_proposal_simulation: true },
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
        simulate_request: {
          options: { enable_proposal_simulation: true },
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
