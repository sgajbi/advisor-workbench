import { describe, expect, it } from "vitest";

import {
  buildOutcomeReviewHandoffMessages,
  buildOutcomeReviewStatePanelCopy,
  countReadyOutcomeReviewEvidence,
  describeOutcomeNarrativeRun,
  outcomeReviewAvailabilityClass,
  outcomeReviewAvailabilityLabel,
  outcomeReviewBadgeTone,
  outcomeReviewDimensionLabel,
  shouldShowOutcomeReviewStatePanel,
} from "../../src/features/workbench/outcome-review-panel-helpers";
import type { OutcomeReviewListItem } from "../../src/features/workbench/outcome-review-view-model";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

const review: OutcomeReviewListItem = {
  outcomeReviewId: "or_1",
  reviewLabel: "Outcome Review",
  state: "READY",
  overallOutcome: "READY_WITHIN_TOLERANCE",
  reviewWindow: "01 May 2026 to 13 May 2026",
  outcomeStatusLabel: "Within expected tolerance",
  reviewPostureLabel: "Ready for adviser review",
  driftImprovementLabel: "72.4%",
  mandateImpact: "Outcome remains within mandate tolerance.",
  clientRationale: "Client-facing rationale.",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  rebalanceRunId: "rr_1",
  waveId: "wave_1",
  proofPackId: "ppack_1",
  expectedSnapshotHash: "sha256:expected",
  realizedSnapshotHash: "sha256:realized",
  retentionUntil: "2033-02-24",
  sourceUpdatedAt: "2026-05-13T09:35:00Z",
  updatedAt: "2026-05-13T09:35:00Z",
  reportInputBlocked: false,
  aiEvidenceBlocked: false,
  clientCommunicationBoundary: null,
  dimensions: [],
  lineage: [
    {
      key: "risk-risk_1-0",
      source: "lotus-risk",
      reference: "risk_1",
      freshness: "fresh",
      hash: "sha256:risk",
    },
  ],
};

describe("outcome review panel helpers", () => {
  it("maps outcome states to display badge tones", () => {
    expect(outcomeReviewBadgeTone("SUPPORTED")).toBe("success");
    expect(outcomeReviewBadgeTone("WITHIN_TOLERANCE")).toBe("success");
    expect(outcomeReviewBadgeTone("PENDING_REVIEW")).toBe("warn");
    expect(outcomeReviewBadgeTone("DEGRADED")).toBe("warn");
    expect(outcomeReviewBadgeTone("BLOCKED")).toBe("danger");
    expect(outcomeReviewBadgeTone("LIMIT_BREACH")).toBe("danger");
    expect(outcomeReviewBadgeTone("SOURCE_READY")).toBe("default");
  });

  it("maps outcome dimensions as business concepts rather than states", () => {
    expect(outcomeReviewDimensionLabel("DRIFT_REDUCTION")).toBe(
      "Drift reduction",
    );
  });

  it("builds deterministic state-panel copy", () => {
    expect(
      buildOutcomeReviewStatePanelCopy("empty", "PB_SG_GLOBAL_BAL_001"),
    ).toMatchObject({
      kind: "empty",
      title: "No outcome reviews for this portfolio",
    });
    expect(buildOutcomeReviewStatePanelCopy("blocked", "P1")).toMatchObject({
      kind: "permission_blocked",
      title: "Outcome review handoff is blocked",
    });
    expect(buildOutcomeReviewStatePanelCopy("unsupported", "P1")).toMatchObject(
      {
        kind: "unavailable",
        title: "Outcome review is not supported",
      },
    );
    expect(buildOutcomeReviewStatePanelCopy("unavailable", "P1")).toMatchObject(
      {
        kind: "partial",
        title: "Outcome review data is unavailable",
      },
    );
  });

  it("shows state panels for explicit non-ready and error states", () => {
    expect(shouldShowOutcomeReviewStatePanel("ready", null)).toBe(false);
    expect(shouldShowOutcomeReviewStatePanel("partial", null)).toBe(false);
    expect(shouldShowOutcomeReviewStatePanel("ready", "Gateway failed")).toBe(
      true,
    );
    expect(shouldShowOutcomeReviewStatePanel("empty", null)).toBe(true);
    expect(shouldShowOutcomeReviewStatePanel("blocked", null)).toBe(true);
    expect(shouldShowOutcomeReviewStatePanel("unsupported", null)).toBe(true);
    expect(shouldShowOutcomeReviewStatePanel("unavailable", null)).toBe(true);
  });

  it("summarizes evidence availability without recomputing outcome results", () => {
    expect(countReadyOutcomeReviewEvidence(review)).toBe(4);
    expect(
      countReadyOutcomeReviewEvidence({
        ...review,
        proofPackId: "N/A",
        lineage: [],
      }),
    ).toBe(2);
    expect(countReadyOutcomeReviewEvidence(null)).toBe(0);
    expect(outcomeReviewAvailabilityLabel("ppack_1")).toBe("Available");
    expect(outcomeReviewAvailabilityLabel("N/A")).toBe("Not available");
    expect(outcomeReviewAvailabilityClass("ppack_1")).toBe("is-available");
    expect(outcomeReviewAvailabilityClass("N/A")).toBe("is-muted");
  });

  it("returns compact report and AI handoff messages", () => {
    expect(
      buildOutcomeReviewHandoffMessages(
        "Report request Accepted.",
        "Review request Completed.",
      ),
    ).toEqual(["Report request Accepted.", "Review request Completed."]);
    expect(
      buildOutcomeReviewHandoffMessages(null, "Review request Submitted."),
    ).toEqual(["Review request Submitted."]);
  });

  it("describes governed narrative workflow-pack run posture", () => {
    expect(
      describeOutcomeNarrativeRun(
        buildDpmAiWorkflowExecution("outcome-narrative"),
      ),
    ).toBe("Review request Awaiting review.");
    expect(
      describeOutcomeNarrativeRun(
        buildDpmAiWorkflowExecution("outcome-narrative", {
          reviewState: "ACCEPTED",
        }),
      ),
    ).toBe("Review request Accepted.");
  });
});
