import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewRationaleEvidenceSection from "../../src/features/workbench/components/outcome-review-rationale-evidence-section";
import type { OutcomeReviewClientCommunicationBoundaryView } from "../../src/features/workbench/outcome-review-view-model";

describe("OutcomeReviewRationaleEvidenceSection", () => {
  it("renders internal rationale, no-client-communication boundary, and evidence posture", () => {
    render(
      <OutcomeReviewRationaleEvidenceSection
        clientRationale="Mandate drift was reduced and portfolio suitability evidence remains available for internal review."
        clientCommunicationBoundary={clientCommunicationBoundary()}
        expectedSnapshotHash="sha256:expected-hidden"
        realizedSnapshotHash="sha256:realized-hidden"
        proofPackId="proof-pack-hidden"
        readyEvidenceCount={3}
      />,
    );

    const section = screen.getByLabelText("Outcome review rationale and evidence");

    expect(section).toHaveTextContent("Internal outcome rationale");
    expect(section).toHaveTextContent("Mandate drift was reduced");
    expect(section).toHaveTextContent("Client communication controls");
    expect(section).toHaveTextContent("CommunicationNot projected");
    expect(section).toHaveTextContent("ApprovalNot projected");
    expect(section).toHaveTextContent("ClientCommunicationRecord:v1");
    expect(section).toHaveTextContent("Evidence availability");
    expect(section).toHaveTextContent("Expected outcome Available");
    expect(section).toHaveTextContent("Realised outcome Available");
    expect(section).toHaveTextContent("Evidence pack Available");
    expect(section).toHaveTextContent("Source evidence Available");
  });

  it("keeps rationale evidence display-only without source identifiers or workflow controls", () => {
    render(
      <OutcomeReviewRationaleEvidenceSection
        clientRationale="Outcome remains suitable for adviser review."
        clientCommunicationBoundary={null}
        expectedSnapshotHash=""
        realizedSnapshotHash=""
        proofPackId=""
        readyEvidenceCount={1}
      />,
    );

    expect(screen.queryByText(/outcome_review_id|rebalance_run_id|wave_id|sha256/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
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
