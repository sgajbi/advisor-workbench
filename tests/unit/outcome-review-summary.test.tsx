import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewSummary from "../../src/features/workbench/components/outcome-review-summary";
import type {
  OutcomeReviewListItem,
  OutcomeReviewPanelModel,
} from "../../src/features/workbench/outcome-review-view-model";

describe("OutcomeReviewSummary", () => {
  it("renders the three decision facts and supportability reasons without duplicate readiness", () => {
    render(
      <OutcomeReviewSummary
        portfolioId="PB_SG_GLOBAL_BAL_001"
        model={panelModel()}
        primaryReview={reviewItem()}
      />,
    );

    expect(screen.queryByText("Outcome review data is unavailable")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Outcome review decision summary")).toHaveTextContent(
      "Ready for adviser review",
    );
    expect(screen.getByLabelText("Outcome review decision summary")).toHaveTextContent(
      "Within expected tolerance",
    );
    expect(screen.getByLabelText("Outcome review decision summary")).toHaveTextContent("72.4%");
    expect(screen.getByLabelText("Outcome review decision summary")).not.toHaveTextContent(
      "Evidence pack",
    );
    expect(screen.getByText("Report preparation ready")).toBeInTheDocument();
    expect(screen.queryByText(/or_1|rr_1|wave_1|sha256/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("renders unavailable and blocked posture without unsupported workflow controls", () => {
    render(
      <OutcomeReviewSummary
        portfolioId="PB_SG_GLOBAL_BAL_001"
        model={{
          ...panelModel(),
          state: "unavailable",
          supportabilityState: "UNAVAILABLE",
          supportabilityReasons: ["GATEWAY_OUTCOME_REVIEW_UNAVAILABLE"],
          blockedActions: ["CREATE_REPORT_INPUT", "REQUEST_AI_NARRATIVE"],
          remediationOwner: "Front-office operations",
          items: [],
        }}
        primaryReview={null}
        errorMessage="Failed to fetch DPM outcome reviews (503)"
      />,
    );

    expect(screen.getByText("Outcome review is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM outcome reviews (503)")).toBeInTheDocument();
    expect(screen.getByLabelText("Outcome review decision summary")).toHaveTextContent("N/A");
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Front-office operations/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

function panelModel(): OutcomeReviewPanelModel {
  const review = reviewItem();
  return {
    state: "ready",
    supportabilityState: "SUPPORTED",
    supportabilityReasons: ["READY_FOR_REPORT_INPUT"],
    blockedActions: [],
    remediationOwner: "N/A",
    sourceService: "lotus-manage",
    authority: "lotus-manage:RFC-0042",
    correlationId: "corr-rfc42",
    items: [review],
  };
}

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
    clientRationale: "Outcome remains within mandate tolerance for adviser handoff.",
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
    clientCommunicationBoundary: null,
    dimensions: [],
    lineage: [],
  };
}
