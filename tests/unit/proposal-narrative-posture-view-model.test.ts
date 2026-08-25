import { describe, expect, it } from "vitest";

import {
  buildProposalNarrativePostureModel,
  confirmDiscussionPackRefresh,
  confirmNarrativeReviewRefresh,
} from "../../src/features/proposals/proposal-narrative-posture-view-model";
import { formatProposalEvidenceHash } from "../../src/features/proposals/proposal-evidence-formatters";

describe("proposal narrative posture view model", () => {
  it("prioritizes reviewed narrative and report-package posture from advisory payloads", () => {
    const model = buildProposalNarrativePostureModel({
      review: {
        policy_version: "proposal-narrative-deterministic.v1",
        narrative_review: {
          review_state: "APPROVED_FOR_ADVISOR_USE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
      report: {
        status: "READY",
        explanation: {
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      },
      summary: {
        reporting: {
          status: "READY",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
          },
        },
      },
      events: {
        event_count: 2,
        latest_event: {
          event_type: "REPORT_REQUESTED",
          occurred_at: "2026-05-22T09:00:00Z",
        },
      },
    });

    expect(model.reviewState).toBe("Approved For Advisor Use");
    expect(model.reportPackageState).toBe("Included Reviewed Narrative");
    expect(model.deliveryState).toBe("Ready");
    expect(model.sourceNarrativeHash).toBe("sha256:narrative-001");
    expect(model.eventCount).toBe(2);
    expect(model.latestEventLabel).toBe("Report Requested");
    expect(model.latestEventTime).toBe("22 May 2026, 09:00 UTC");
    expect(model.policyVersion).toBe("proposal-narrative-deterministic.v1");
    expect(model.canRequestDiscussionPack).toBe(false);
    expect(model.nextActionTitle).toBe("Review the latest delivery activity");
    expect(model.workflowItems).toEqual([
      expect.objectContaining({
        label: "Recommendation rationale",
        value: "Available",
      }),
      expect.objectContaining({ label: "Advisor review", tone: "success" }),
      expect.objectContaining({
        label: "Discussion pack",
        value: "Included Reviewed Narrative",
      }),
      expect.objectContaining({
        label: "Delivery record",
        value: "Report Requested",
      }),
    ]);
  });

  it("fails closed when a delivery event omits timezone evidence", () => {
    const model = buildProposalNarrativePostureModel({
      events: {
        event_count: 1,
        latest_event: {
          event_type: "REPORT_REQUESTED",
          occurred_at: "2026-05-22T09:00:00",
        },
      },
    });

    expect(model.latestEventTime).toBe("Not reported");
  });

  it("keeps missing posture explicit instead of inventing client-ready state", () => {
    const model = buildProposalNarrativePostureModel({});

    expect(model.reviewState).toBe("Not Reviewed");
    expect(model.reportPackageState).toBe("Not Requested");
    expect(model.deliveryState).toBe("No Report");
    expect(model.sourceNarrativeHash).toBeNull();
    expect(model.eventCount).toBe(0);
    expect(model.latestEventLabel).toBe("No delivery activity");
    expect(model.canRequestDiscussionPack).toBe(false);
    expect(model.nextActionTitle).toBe("Record advisor review");
  });

  it("admits a discussion-pack request only after the source confirms advisor review", () => {
    const model = buildProposalNarrativePostureModel({
      summary: {
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
          proposal_narrative_package: {
            review_state: "APPROVED_FOR_ADVISOR_USE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      },
    });

    expect(model.canRequestDiscussionPack).toBe(true);
    expect(model.nextActionTitle).toBe("Request the discussion pack");
  });

  it("requires refreshed source evidence to match the recorded narrative review", () => {
    const review = {
      policy_version: "proposal-narrative-deterministic.v1",
      narrative_review: {
        review_state: "APPROVED_FOR_ADVISOR_USE",
        source_narrative_hash: "sha256:narrative-001",
      },
    };

    expect(() =>
      confirmNarrativeReviewRefresh({
        review,
        summary: {
          reporting: {
            proposal_narrative_package: {
              review_state: "APPROVED_FOR_ADVISOR_USE",
              source_narrative_hash: "sha256:narrative-001",
            },
          },
        },
      }),
    ).not.toThrow();
    expect(() =>
      confirmNarrativeReviewRefresh({
        review,
        summary: {
          reporting: {
            proposal_narrative_package: {
              review_state: "APPROVED_FOR_ADVISOR_USE",
              source_narrative_hash: "sha256:different",
            },
          },
        },
      }),
    ).toThrow("refreshed proposal evidence did not confirm it");
  });

  it("requires refreshed preparation status before confirming a discussion-pack request", () => {
    const report = {
      status: "READY",
      explanation: {
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "REQUESTED",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    };

    expect(() =>
      confirmDiscussionPackRefresh({
        report,
        summary: {
          reporting: {
            include_reviewed_narrative: true,
            proposal_narrative_package: { package_status: "REQUESTED" },
          },
        },
      }),
    ).not.toThrow();
    expect(() => confirmDiscussionPackRefresh({ report, summary: {} })).toThrow(
      "refreshed preparation status was not available",
    );
  });

  it("shortens long evidence hashes for dense UI display", () => {
    expect(
      formatProposalEvidenceHash("sha256:1234567890abcdef1234567890abcdef"),
    ).toBe("sha256:123456789...90abcdef");
    expect(formatProposalEvidenceHash(null)).toBe("Not available");
  });
});
