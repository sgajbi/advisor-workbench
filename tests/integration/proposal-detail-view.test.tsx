import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalDetailView from "../../src/features/proposals/components/proposal-detail-view";

const {
  getProposalMock,
  submitProposalMock,
  approveRiskMock,
  approveComplianceMock,
  recordClientConsentMock,
  getWorkflowEventsMock,
  getApprovalsMock,
  getLineageMock,
} = vi.hoisted(() => ({
  getProposalMock: vi.fn(async () => ({
    proposal: {
      proposal_id: "pp_1",
      current_state: "DRAFT",
      portfolio_id: "pf_1",
      current_version_no: 1,
    },
  })),
  submitProposalMock: vi.fn(async () => ({ data: { current_state: "RISK_REVIEW" } })),
  approveRiskMock: vi.fn(async () => ({ data: { current_state: "AWAITING_CLIENT_CONSENT" } })),
  approveComplianceMock: vi.fn(async () => ({ data: { current_state: "AWAITING_CLIENT_CONSENT" } })),
  recordClientConsentMock: vi.fn(async () => ({ data: { current_state: "EXECUTION_READY" } })),
  getWorkflowEventsMock: vi.fn(async () => ({
    proposal_id: "pp_1",
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
    proposal_id: "pp_1",
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
    proposal_id: "pp_1",
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
        <ProposalDetailView proposalId="pp_1" />
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
  });

  it("approves risk when in risk review", async () => {
    getProposalMock.mockResolvedValueOnce({
      proposal: {
        proposal_id: "pp_1",
        current_state: "RISK_REVIEW",
        portfolio_id: "pf_1",
        current_version_no: 1,
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
  });

  it("records client consent when awaiting client consent", async () => {
    getProposalMock.mockResolvedValueOnce({
      proposal: {
        proposal_id: "pp_1",
        current_state: "AWAITING_CLIENT_CONSENT",
        portfolio_id: "pf_1",
        current_version_no: 1,
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
  });
});
