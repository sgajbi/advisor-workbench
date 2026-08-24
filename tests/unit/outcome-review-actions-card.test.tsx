import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OutcomeReviewActionsCard from "../../src/features/workbench/components/outcome-review-actions-card";
import type { OutcomeReviewListItem } from "../../src/features/workbench/outcome-review-view-model";

const baseReview: OutcomeReviewListItem = {
  outcomeReviewId: "or_hidden_1",
  reviewLabel: "Review 1",
  state: "READY",
  overallOutcome: "READY_WITHIN_TOLERANCE",
  reviewWindow: "01 May 2026 - 13 May 2026",
  outcomeStatusLabel: "Within Mandate",
  reviewPostureLabel: "Ready for Advisor Review",
  driftImprovementLabel: "72.4%",
  mandateImpact: "Outcome remains within mandate tolerance.",
  clientRationale: "Internal review rationale.",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  rebalanceRunId: "rr_hidden_1",
  waveId: "dwv_hidden_1",
  proofPackId: "ppack_1",
  expectedSnapshotHash: "sha256:expected",
  realizedSnapshotHash: "sha256:realized",
  retentionUntil: "2026-12-31",
  sourceUpdatedAt: "2026-05-13T09:35:00Z",
  updatedAt: "2026-05-13T09:35:00Z",
  reportInputBlocked: false,
  aiEvidenceBlocked: false,
  clientCommunicationBoundary: null,
  dimensions: [],
  lineage: [],
};

describe("OutcomeReviewActionsCard", () => {
  it("renders delegated review actions without leaking source identifiers", () => {
    const onRequestAiNarrative = vi.fn();

    render(
      <OutcomeReviewActionsCard
        primaryReview={baseReview}
        evidencePackHref="/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
        aiNarrativeAvailable
        aiNarrativePending={false}
        onRequestAiNarrative={onRequestAiNarrative}
      />
    );

    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review mandate impact/ })).toHaveAttribute(
      "href",
      "#outcome-review-detail"
    );
    expect(screen.getByRole("link", { name: /Open evidence pack/ })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
    );

    fireEvent.click(screen.getByRole("button", { name: /Request advisor memo/ }));
    expect(onRequestAiNarrative).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("or_hidden_1")).not.toBeInTheDocument();
    expect(screen.queryByText("rr_hidden_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:expected")).not.toBeInTheDocument();
  });

  it("keeps unsupported handoffs disabled without client communication or execution controls", () => {
    const onRequestAiNarrative = vi.fn();

    render(
      <OutcomeReviewActionsCard
        primaryReview={{ ...baseReview, proofPackId: "N/A" }}
        evidencePackHref="/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
        aiNarrativeAvailable={false}
        aiNarrativePending={false}
        onRequestAiNarrative={onRequestAiNarrative}
      />
    );

    expect(screen.getByRole("button", { name: /Open evidence pack/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Request advisor memo/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
