import { describe, expect, it } from "vitest";

import {
  buildProposalNarrativePostureModel,
  confirmDiscussionPackRefresh,
  confirmNarrativeReviewRefresh,
} from "../../src/features/proposals/proposal-narrative-posture-view-model";
import { formatProposalEvidenceHash } from "../../src/features/proposals/proposal-evidence-formatters";
import type {
  ProposalDeliveryEventsData,
  ProposalDeliverySummaryData,
  ProposalNarrativeReviewData,
  ProposalReportRequestData,
} from "../../src/features/proposals/types";

const activeProposal = { proposalId: "pp_1", versionNo: 2 } as const;
const activeProposalSummary = {
  proposal_id: "pp_1",
  current_state: "DRAFT",
  current_version_no: 2,
};
const confirmedReview: ProposalNarrativeReviewData = {
  policy_version: "proposal-narrative-deterministic.v1",
  narrative_review: {
    review_id: "review-001",
    proposal_id: "pp_1",
    proposal_version_no: 2,
    narrative_id: "narrative-001",
    review_state: "APPROVED_FOR_ADVISOR_USE",
    action: "APPROVE",
    source_narrative_hash: "sha256:narrative-001",
    reviewed_by: "advisor_1",
    reviewed_at: "2026-05-22T09:00:00Z",
  },
};

function discussionPackSummary(
  reporting: Partial<NonNullable<ProposalDeliverySummaryData["reporting"]>> = {},
  proposal = activeProposalSummary,
): ProposalDeliverySummaryData {
  return {
    proposal,
    reporting: {
      report_request_id: "report-001",
      report_type: "PORTFOLIO_REVIEW",
      related_version_no: 2,
      status: "REQUESTED",
      include_reviewed_narrative: true,
      proposal_narrative_package: {
        related_version_no: 2,
        package_status: "REQUESTED",
        source_narrative_hash: "sha256:narrative-001",
      },
      ...reporting,
    },
  };
}

function discussionPackRequest(
  overrides: Partial<ProposalReportRequestData> = {},
): ProposalReportRequestData {
  return {
    report_request_id: "report-001",
    report_type: "PORTFOLIO_REVIEW",
    status: "REQUESTED",
    explanation: {
      related_version_no: 2,
      include_reviewed_narrative: true,
      proposal_narrative_package: {
        related_version_no: 2,
        package_status: "REQUESTED",
        source_narrative_hash: "sha256:narrative-001",
      },
    },
    ...overrides,
  };
}

function activeEvents(
  overrides: Partial<ProposalDeliveryEventsData> = {},
): ProposalDeliveryEventsData {
  return {
    proposal: activeProposalSummary,
    event_count: 1,
    latest_event: {
      event_type: "REPORT_REQUESTED",
      occurred_at: "2026-05-22T09:00:00Z",
    },
    ...overrides,
  };
}

describe("proposal narrative posture view model", () => {
  it("projects only complete, current source evidence as requested", () => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      review: confirmedReview,
      summary: discussionPackSummary({
        status: "READY",
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
      events: activeEvents({ event_count: 2 }),
    });

    expect(model).toMatchObject({
      reviewState: "Approved For Advisor Use",
      reviewTone: "success",
      reportPackageState: "Included Reviewed Narrative",
      deliveryState: "Ready",
      sourceNarrativeHash: "sha256:narrative-001",
      eventCount: 2,
      latestEventLabel: "Report Requested",
      latestEventTime: "22 May 2026, 09:00 UTC",
      canRequestDiscussionPack: false,
      nextActionTitle: "Review the latest delivery activity",
    });
  });

  it("keeps missing posture explicit instead of inventing client-ready state", () => {
    const model = buildProposalNarrativePostureModel(activeProposal);

    expect(model).toMatchObject({
      reviewState: "Not Reviewed",
      reviewTone: "warn",
      reportPackageState: "Not Requested",
      deliveryState: "No Report",
      sourceNarrativeHash: null,
      eventCount: 0,
      latestEventLabel: "No delivery activity",
      canRequestDiscussionPack: false,
      nextActionTitle: "Record advisor review",
    });
  });

  it.each([
    ["review_id", undefined],
    ["review_id", "   "],
    ["source_narrative_hash", " "],
    ["reviewed_by", ""],
    ["reviewed_at", "2026-05-22T09:00:00"],
    ["action", "REJECT"],
  ])("fails closed when confirmed review %s is %s", (field, value) => {
    const review = {
      ...confirmedReview,
      narrative_review: {
        ...confirmedReview.narrative_review,
        [field]: value,
      },
    };
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      review,
    });

    expect(model.reviewState).toBe("Not Reviewed");
    expect(model.canRequestDiscussionPack).toBe(false);
  });

  it("does not admit a review returned for another proposal version", () => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      review: {
        ...confirmedReview,
        narrative_review: {
          ...confirmedReview.narrative_review,
          proposal_version_no: 1,
        },
      },
    });

    expect(model.reviewState).toBe("Not Reviewed");
    expect(model.sourceNarrativeHash).toBeNull();
    expect(model.canRequestDiscussionPack).toBe(false);
  });

  it.each([
    ["wrong proposal", discussionPackSummary({}, { ...activeProposalSummary, proposal_id: "pp_2" })],
    ["wrong version", discussionPackSummary({}, { ...activeProposalSummary, current_version_no: 1 })],
    ["missing request", discussionPackSummary({ report_request_id: undefined })],
    ["wrong type", discussionPackSummary({ report_type: "OTHER" })],
    ["failed report", discussionPackSummary({ status: "FAILED" })],
    ["missing report state", discussionPackSummary({ status: undefined })],
    [
      "failed package",
      discussionPackSummary({
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "FAILED",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
    ],
    [
      "wrong narrative",
      discussionPackSummary({
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "REQUESTED",
          source_narrative_hash: "sha256:other",
        },
      }),
    ],
  ])("rejects %s discussion-pack summary evidence", (_label, summary) => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      review: confirmedReview,
      summary,
    });

    expect(model.reportPackageState).toBe("Not Requested");
    expect(model.deliveryState).toBe("No Report");
    expect(model.canRequestDiscussionPack).toBe(true);
  });

  it("ignores delivery events for another proposal or version", () => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      events: activeEvents({
        proposal: { ...activeProposalSummary, proposal_id: "pp_2" },
      }),
    });

    expect(model.eventCount).toBe(0);
    expect(model.latestEventLabel).toBe("No delivery activity");
    expect(model.latestEventTime).toBeNull();
  });

  it("fails closed when a current delivery event omits timezone evidence", () => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      events: activeEvents({
        latest_event: {
          event_type: "REPORT_REQUESTED",
          occurred_at: "2026-05-22T09:00:00",
        },
      }),
    });

    expect(model.latestEventTime).toBe("Not reported");
  });

  it("requires an exact complete refreshed review record", () => {
    expect(() =>
      confirmNarrativeReviewRefresh({
        ...activeProposal,
        review: confirmedReview,
        refreshedReview: confirmedReview,
      }),
    ).not.toThrow();

    for (const invalidPatch of [
      { review_id: "review-other" },
      { source_narrative_hash: " " },
      { reviewed_by: "" },
      { reviewed_at: "not-a-time" },
      { action: "REJECT" },
      { proposal_version_no: 1 },
    ]) {
      expect(() =>
        confirmNarrativeReviewRefresh({
          ...activeProposal,
          review: confirmedReview,
          refreshedReview: {
            ...confirmedReview,
            narrative_review: {
              ...confirmedReview.narrative_review,
              ...invalidPatch,
            },
          },
        }),
      ).toThrow("refreshed proposal evidence did not confirm it");
    }
  });

  it("confirms a discussion pack only from matching action, summary and event refreshes", () => {
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest(),
        summary: discussionPackSummary(),
        events: activeEvents(),
      }),
    ).not.toThrow();
  });

  it.each([
    ["failed action", discussionPackRequest({ status: "FAILED" }), discussionPackSummary(), activeEvents()],
    ["wrong action type", discussionPackRequest({ report_type: "OTHER" }), discussionPackSummary(), activeEvents()],
    ["wrong summary type", discussionPackRequest(), discussionPackSummary({ report_type: "OTHER" }), activeEvents()],
    ["failed summary", discussionPackRequest(), discussionPackSummary({ status: "FAILED" }), activeEvents()],
    ["stale request", discussionPackRequest(), discussionPackSummary({ report_request_id: "report-old" }), activeEvents()],
    ["wrong proposal", discussionPackRequest(), discussionPackSummary({}, { ...activeProposalSummary, proposal_id: "pp_2" }), activeEvents()],
    ["wrong events", discussionPackRequest(), discussionPackSummary(), activeEvents({ proposal: { ...activeProposalSummary, current_version_no: 1 } })],
  ])("withholds confirmation for %s evidence", (_label, report, summary, events) => {
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report,
        summary,
        events,
      }),
    ).toThrow(
      "refreshed preparation status for the reviewed proposal version was not available",
    );
  });

  it("shortens long evidence hashes for dense UI display", () => {
    expect(
      formatProposalEvidenceHash("sha256:1234567890abcdef1234567890abcdef"),
    ).toBe("sha256:123456789...90abcdef");
    expect(formatProposalEvidenceHash(null)).toBe("Not available");
  });
});
