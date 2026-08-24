import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OutcomeReviewDetailPanel from "../../src/features/workbench/components/outcome-review-detail-panel";
import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
} from "../../src/features/workbench/outcome-review-view-model";

describe("OutcomeReviewDetailPanel", () => {
  it("renders selected review detail and delegates handoff actions", () => {
    const onRequestReportJob = vi.fn();
    const onRequestAiNarrative = vi.fn();

    render(
      <OutcomeReviewDetailPanel
        primaryReview={reviewItem()}
        clientCommunicationBoundary={clientCommunicationBoundary()}
        readyEvidenceCount={4}
        reportJobAvailable
        reportJobPending={false}
        aiNarrativeAvailable
        aiNarrativePending={false}
        onRequestReportJob={onRequestReportJob}
        onRequestAiNarrative={onRequestAiNarrative}
      />
    );

    expect(screen.getByText("Selected Review Detail")).toBeInTheDocument();
    expect(screen.getByText("13 May 2026 review")).toBeInTheDocument();
    expect(screen.getByText("Mandate Impact")).toBeInTheDocument();
    expect(screen.getByText("Internal Outcome Rationale")).toBeInTheDocument();
    expect(screen.getByLabelText("Client communication boundary")).toHaveTextContent(
      "Not projected"
    );

    fireEvent.click(screen.getByRole("button", { name: "Request report" }));
    fireEvent.click(screen.getByRole("button", { name: "Request advisor memo" }));

    expect(onRequestReportJob).toHaveBeenCalledTimes(1);
    expect(onRequestAiNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps unsupported handoffs disabled without exposing workflow controls", () => {
    render(
      <OutcomeReviewDetailPanel
        primaryReview={reviewItem()}
        clientCommunicationBoundary={clientCommunicationBoundary()}
        readyEvidenceCount={2}
        reportJobAvailable={false}
        reportJobPending={false}
        aiNarrativeAvailable={false}
        aiNarrativePending={false}
        onRequestReportJob={vi.fn()}
        onRequestAiNarrative={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Request report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Request advisor memo" })).toBeDisabled();
    expect(screen.queryByText(/outcome_review_id|rebalance_run_id|wave_id|sha256/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});

function reviewItem(): OutcomeReviewListItem {
  return {
    outcomeReviewId: "or_1",
    reviewLabel: "13 May 2026 review",
    state: "READY",
    overallOutcome: "READY_WITHIN_TOLERANCE",
    reviewWindow: "01 May 2026 - 13 May 2026",
    outcomeStatusLabel: "Within expected tolerance",
    reviewPostureLabel: "Ready for adviser review",
    driftImprovementLabel: "72.4%",
    mandateImpact: "Drift reduction achieved within tolerance.",
    clientRationale: "Outcome remains within mandate tolerance for advisor handoff.",
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    rebalanceRunId: "rr_1",
    waveId: "wave_1",
    proofPackId: "ppack_1",
    expectedSnapshotHash: "sha256:expected",
    realizedSnapshotHash: "sha256:realized",
    retentionUntil: "2026-06-13T09:35:00Z",
    sourceUpdatedAt: "2026-05-13T09:35:00Z",
    updatedAt: "2026-05-13T09:35:00Z",
    reportInputBlocked: false,
    aiEvidenceBlocked: false,
    clientCommunicationBoundary: clientCommunicationBoundary(),
    dimensions: [
      {
        key: "drift-0",
        dimension: "Drift Reduction",
        expected: "0.012 ratio",
        realized: "0.011 ratio",
        variance: "-0.001 ratio",
        state: "READY",
        explanation: "Drift reduction achieved within tolerance.",
      },
    ],
    lineage: [
      {
        key: "lotus-risk-risk-1-0",
        source: "lotus-risk",
        reference: "risk-1",
        freshness: "fresh",
        hash: "sha256:risk",
      },
    ],
  };
}

function clientCommunicationBoundary(): OutcomeReviewClientCommunicationBoundaryView {
  return {
    boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
    state: "UNSUPPORTED",
    reasonCode: "CLIENT_COMMUNICATION_NOT_PROJECTED",
    summary: "Client communication is not projected from outcome review evidence.",
    clientCommunicationProjected: false,
    clientApprovalProjected: false,
    blockedCapabilities: ["Client Message Generation"],
    requiredOwner: "lotus-manage",
    requiredSourceProduct: "ClientCommunicationRecord:v1",
    sourceProduct: "ClientCommunicationRecord:v1",
    contentHash: "sha256:boundary",
  };
}
