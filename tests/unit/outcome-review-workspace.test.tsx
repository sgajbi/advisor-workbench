import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OutcomeReviewWorkspace from "../../src/features/workbench/components/outcome-review-workspace";
import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
} from "../../src/features/workbench/outcome-review-view-model";

describe("OutcomeReviewWorkspace", () => {
  it("composes selected-review evidence and delegates Gateway-backed actions", () => {
    const onRequestReportJob = vi.fn();
    const onRequestAiNarrative = vi.fn();
    const review = reviewItem();

    render(
      <OutcomeReviewWorkspace
        items={[review]}
        primaryReview={review}
        clientCommunicationBoundary={clientCommunicationBoundary()}
        evidencePackHref="/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
        readyEvidenceCount={4}
        reportJobAvailable
        reportJobPending={false}
        aiNarrativeAvailable
        aiNarrativePending={false}
        onRequestReportJob={onRequestReportJob}
        onRequestAiNarrative={onRequestAiNarrative}
      />
    );

    expect(screen.queryByLabelText("Selected outcome review readiness")).not.toBeInTheDocument();
    expect(screen.getByText("Review timeline")).toBeInTheDocument();
    expect(screen.getByText("Recommended actions")).toBeInTheDocument();
    expect(screen.getByText("Selected review detail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open evidence pack/ })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
    );
    expect(screen.getByLabelText("Client communication boundary")).toHaveTextContent(
      "Not projected"
    );

    fireEvent.click(screen.getByRole("button", { name: "Request report" }));
    const aiSummaryAction = screen.getByRole("button", {
      name: /Prepare AI-assisted review summary/,
    });
    fireEvent.click(aiSummaryAction);

    expect(onRequestReportJob).toHaveBeenCalledTimes(1);
    expect(onRequestAiNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps blocked posture display-only without unsupported workflow controls", () => {
    const review = {
      ...reviewItem(),
      reportInputBlocked: true,
      aiEvidenceBlocked: true,
    };

    render(
      <OutcomeReviewWorkspace
        items={[review]}
        primaryReview={review}
        clientCommunicationBoundary={clientCommunicationBoundary()}
        evidencePackHref="/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
        readyEvidenceCount={2}
        reportJobAvailable={false}
        reportJobPending={false}
        aiNarrativeAvailable={false}
        aiNarrativePending={false}
        onRequestReportJob={vi.fn()}
        onRequestAiNarrative={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Selected outcome review readiness")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request report" })).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: /Prepare AI-assisted review summary/,
      }),
    ).toBeDisabled();
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
    clientRationale: "Outcome remains within expected tolerance for adviser review.",
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
