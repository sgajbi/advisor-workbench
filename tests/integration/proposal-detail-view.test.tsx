import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import ProposalDetailView from "../../src/features/proposals/components/proposal-detail-view";

const { getProposalMock, submitProposalMock } = vi.hoisted(() => ({
  getProposalMock: vi.fn(async () => ({
    proposal: {
      proposal_id: "pp_1",
      current_state: "DRAFT",
      portfolio_id: "pf_1",
      current_version_no: 1,
    },
  })),
  submitProposalMock: vi.fn(async () => ({
    data: { proposal_id: "pp_1", current_state: "RISK_REVIEW" },
  })),
}));

vi.mock("../../src/features/proposals/api", () => ({
  getProposal: getProposalMock,
  submitProposal: submitProposalMock,
}));

describe("ProposalDetailView", () => {
  it("submits proposal for review from draft", async () => {
    render(<ProposalDetailView proposalId="pp_1" />);

    await waitFor(() => {
      expect(screen.getByText("State: DRAFT")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit For Review" }));

    await waitFor(() => {
      expect(submitProposalMock).toHaveBeenCalled();
    });
  });
});
