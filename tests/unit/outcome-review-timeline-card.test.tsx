import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewTimelineCard from "../../src/features/workbench/components/outcome-review-timeline-card";
import type { OutcomeReviewListItem } from "../../src/features/workbench/outcome-review-view-model";

const baseItem: OutcomeReviewListItem = {
  outcomeReviewId: "or_internal_1",
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
  rebalanceRunId: "rr_internal_1",
  waveId: "dwv_internal_1",
  proofPackId: "ppack_internal_1",
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

describe("OutcomeReviewTimelineCard", () => {
  it("renders outcome review rows without leaking source identifiers", () => {
    render(<OutcomeReviewTimelineCard items={[baseItem]} />);

    expect(screen.getByRole("heading", { name: "Review Timeline" })).toBeInTheDocument();
    expect(screen.getByText("1 returned")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Outcome reviews" });
    expect(within(table).getByText("Review 1")).toBeInTheDocument();
    expect(within(table).getByText("01 May 2026 - 13 May 2026")).toBeInTheDocument();
    expect(within(table).getByText("Within Mandate")).toBeInTheDocument();
    expect(within(table).getByText("Ready")).toBeInTheDocument();
    expect(within(table).getByText("Available")).toBeInTheDocument();

    expect(screen.queryByText("or_internal_1")).not.toBeInTheDocument();
    expect(screen.queryByText("rr_internal_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:expected")).not.toBeInTheDocument();
  });

  it("renders empty posture without client or execution actions", () => {
    render(<OutcomeReviewTimelineCard items={[]} />);

    expect(screen.getByText("0 returned")).toBeInTheDocument();
    expect(screen.getByText("No outcome reviews returned")).toBeInTheDocument();
    expect(screen.getByText("No outcome review rows are currently available for this portfolio.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/client|approval|message|order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
