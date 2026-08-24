import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewClientBoundaryCard from "../../src/features/workbench/components/outcome-review-client-boundary-card";
import type { OutcomeReviewClientCommunicationBoundaryView } from "../../src/features/workbench/outcome-review-view-model";

describe("OutcomeReviewClientBoundaryCard", () => {
  it("renders the source-owned no-client-communication boundary without action controls", () => {
    render(<OutcomeReviewClientBoundaryCard boundary={clientCommunicationBoundary()} />);

    const boundary = screen.getByLabelText("Client communication boundary");
    expect(boundary).toHaveTextContent("Client communication controls");
    expect(boundary).toHaveTextContent("Blocked");
    expect(boundary).toHaveTextContent(
      "Manage does not publish client communication events for this outcome review."
    );
    expect(boundary).toHaveTextContent("CommunicationNot projected");
    expect(boundary).toHaveTextContent("ApprovalNot projected");
    expect(boundary).toHaveTextContent("Required recordClient communication record");
    expect(boundary).toHaveTextContent(
      "Client communication is not supported on this screen",
    );
    const blockedActions = screen.getByText("View blocked client actions");
    expect(blockedActions.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(blockedActions);
    expect(blockedActions.closest("details")).toHaveAttribute("open");
    expect(boundary).toHaveTextContent("Client message generation");
    expect(boundary).not.toHaveTextContent("ClientCommunicationRecord:v1");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

function clientCommunicationBoundary(): OutcomeReviewClientCommunicationBoundaryView {
  return {
    boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
    state: "BLOCKED",
    reasonCode: "OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED",
    summary: "Manage does not publish client communication events for this outcome review.",
    clientCommunicationProjected: false,
    clientApprovalProjected: false,
    blockedCapabilities: [
      "client_approval",
      "client_contact",
      "client_message_generation",
      "communication_audit",
      "delivery_confirmation",
    ],
    requiredOwner: "future client-communication owner",
    requiredSourceProduct: "ClientCommunicationRecord:v1",
    sourceProduct: "DpmPostTradeOutcomeReview:v1",
    contentHash: "sha256:client-communication-boundary",
  };
}
