import { describe, expect, it } from "vitest";

import {
  buildProposalNarrativePostureModel,
  confirmDiscussionPackRefresh,
  confirmNarrativeReviewRefresh,
} from "../../src/features/proposals/proposal-narrative-posture-view-model";
import { formatProposalEvidenceHash } from "../../src/features/proposals/proposal-evidence-formatters";
import type {
  ProposalDeliveryEvent,
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
      status: "ACCEPTED",
      report_reference_id: "report-document-001",
      generated_at: "2026-05-22T09:01:00Z",
      include_reviewed_narrative: true,
      proposal_narrative_package: {
        proposal_version_no: 2,
        package_status: "INCLUDED_REVIEWED_NARRATIVE",
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
    status: "ACCEPTED",
    report_reference_id: "report-document-001",
    generated_at: "2026-05-22T09:01:00Z",
    explanation: {
      related_version_no: 2,
      include_reviewed_narrative: true,
      proposal_narrative_package: {
        package_status: "INCLUDED_REVIEWED_NARRATIVE",
        source_narrative_hash: "sha256:narrative-001",
      },
    },
    ...overrides,
  };
}

function activeEvents(
  overrides: Partial<ProposalDeliveryEventsData> = {},
): ProposalDeliveryEventsData {
  const event = buildDeliveryEvent();
  return {
    proposal: activeProposalSummary,
    event_count: 1,
    latest_event: event,
    events: [event],
    ...overrides,
  };
}

function buildDeliveryEvent(
  overrides: Partial<ProposalDeliveryEvent> = {},
): ProposalDeliveryEvent {
  return {
    event_id: "delivery-event-001",
    proposal_id: "pp_1",
    related_version_no: 2,
    event_type: "REPORT_REQUESTED",
    occurred_at: "2026-05-22T09:00:00Z",
    reason: { report_request_id: "report-001" },
    ...overrides,
  };
}

function activeSingleEvent(
  overrides: Partial<ProposalDeliveryEvent> = {},
): ProposalDeliveryEventsData {
  const event = buildDeliveryEvent(overrides);
  return activeEvents({ latest_event: event, events: [event] });
}

describe("proposal narrative posture view model", () => {
  it("projects only complete, current source evidence as requested", () => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      review: confirmedReview,
      summary: discussionPackSummary(),
      events: activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          event_type: "EXECUTION_REQUESTED",
          occurred_at: "2026-05-22T09:02:00Z",
          reason: {},
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            event_type: "EXECUTION_REQUESTED",
            occurred_at: "2026-05-22T09:02:00Z",
            reason: {},
          }),
        ],
      }),
    });

    expect(model).toMatchObject({
      reviewState: "Approved For Advisor Use",
      reviewTone: "success",
      reportPackageState: "Reviewed rationale included",
      deliveryState: "Preparation requested",
      sourceNarrativeHash: "sha256:narrative-001",
      eventCount: 2,
      latestEventLabel: "Implementation requested",
      latestEventTime: "22 May 2026, 09:02 UTC",
      canRequestDiscussionPack: false,
      nextActionTitle: "Review the latest delivery activity",
    });
  });

  it("keeps missing posture explicit instead of inventing client-ready state", () => {
    const model = buildProposalNarrativePostureModel(activeProposal);

    expect(model).toMatchObject({
      reviewState: "Not Reviewed",
      reviewTone: "warn",
      reportPackageState: "Not requested",
      deliveryState: "No request",
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
    ["review_state", "APPROVED"],
    ["review_state", "REVIEWED"],
    ["review_state", "approved_for_advisor_use"],
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
    ["blank proposal", " ", 2],
    ["zero version", "pp_1", 0],
    ["negative version", "pp_1", -1],
    ["fractional version", "pp_1", 2.5],
    ["runtime string version", "pp_1", "2" as unknown as number],
  ])("rejects a malformed active identity: %s", (_label, proposalId, versionNo) => {
    const model = buildProposalNarrativePostureModel({
      proposalId,
      versionNo,
      review: {
        ...confirmedReview,
        narrative_review: {
          ...confirmedReview.narrative_review,
          proposal_id: proposalId,
          proposal_version_no: versionNo,
        },
      },
    });

    expect(model.reviewState).toBe("Not Reviewed");
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
      "conflicting source package version",
      discussionPackSummary({
        proposal_narrative_package: {
          proposal_version_no: 1,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
    ],
    [
      "rejected package review",
      discussionPackSummary({
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "REQUESTED",
          review_state: "REJECTED",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
    ],
    [
      "ready package without reference",
      discussionPackSummary({
        status: "READY",
        report_reference_id: undefined,
        generated_at: "2026-05-22T09:01:00Z",
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
    ],
    [
      "ready package without generated time",
      discussionPackSummary({
        status: "READY",
        report_reference_id: "report-document-001",
        generated_at: undefined,
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
    ],
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

    expect(model.reportPackageState).toBe("Not requested");
    expect(model.deliveryState).toBe("No request");
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
    const invalidEvent = buildDeliveryEvent({
      occurred_at: "2026-05-22T09:00:00",
    });
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      events: activeEvents({
        latest_event: invalidEvent,
        events: [invalidEvent],
      }),
    });

    expect(model.eventCount).toBe(0);
    expect(model.latestEventTime).toBeNull();
  });

  it.each([
    ["positive count without event", activeEvents({ event_count: 1, latest_event: undefined, events: [] })],
    ["zero count with latest event", activeEvents({ event_count: 0 })],
    ["count exceeds the returned history", activeEvents({ event_count: 2 })],
    ["negative count", activeEvents({ event_count: -1 })],
    ["fractional count", activeEvents({ event_count: 1.5 })],
    ["padded event identity", activeSingleEvent({ event_id: " delivery-event-001 " })],
    [
      "reverse chronological history",
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          event_type: "EXECUTION_ACCEPTED",
          occurred_at: "2026-05-22T09:00:00Z",
          reason: {},
        }),
        events: [
          buildDeliveryEvent({ occurred_at: "2026-05-22T09:01:00Z" }),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            event_type: "EXECUTION_ACCEPTED",
            occurred_at: "2026-05-22T09:00:00Z",
            reason: {},
          }),
        ],
      }),
    ],
    [
      "duplicate event identity",
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_type: "EXECUTION_ACCEPTED",
          occurred_at: "2026-05-22T09:01:00Z",
          reason: {},
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_type: "EXECUTION_ACCEPTED",
            occurred_at: "2026-05-22T09:01:00Z",
            reason: {},
          }),
        ],
      }),
    ],
    [
      "event from another proposal",
      activeSingleEvent({ proposal_id: "pp_2" }),
    ],
    [
      "event from another proposal version",
      activeSingleEvent({ related_version_no: 1 }),
    ],
    [
      "unknown event type",
      activeEvents({
        latest_event: buildDeliveryEvent({
          event_type: "INTERNAL_TECH_CODE",
        }),
        events: [
          buildDeliveryEvent({
            event_type: "INTERNAL_TECH_CODE",
          }),
        ],
      }),
    ],
    [
      "latest event disagrees with the final listed event",
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent(),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            event_type: "EXECUTION_ACCEPTED",
            occurred_at: "2026-05-22T09:01:00Z",
            reason: {},
          }),
        ],
      }),
    ],
    [
      "latest event reason disagrees with the final listed event",
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          event_type: "EXECUTION_ACCEPTED",
          occurred_at: "2026-05-22T09:01:00Z",
          reason: { execution_request_id: "pex_other" },
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            event_type: "EXECUTION_ACCEPTED",
            occurred_at: "2026-05-22T09:01:00Z",
            reason: { execution_request_id: "pex_current" },
          }),
        ],
      }),
    ],
  ])("rejects a contradictory delivery-event aggregate: %s", (_label, events) => {
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      events,
    });

    expect(model.eventCount).toBe(0);
    expect(model.latestEventLabel).toBe("No delivery activity");
    expect(model.latestEventTime).toBeNull();
  });

  it.each([
    ["REPORT_REQUESTED", "Discussion pack requested"],
    ["EXECUTION_REQUESTED", "Implementation requested"],
    ["EXECUTION_ACCEPTED", "Implementation accepted"],
    ["EXECUTION_PARTIALLY_EXECUTED", "Partially implemented"],
    ["EXECUTION_REJECTED", "Implementation rejected"],
    ["EXECUTION_CANCELLED", "Implementation cancelled"],
    ["EXECUTION_EXPIRED", "Implementation request expired"],
    ["EXECUTED", "Implementation completed"],
  ])("renders the governed %s event as %s", (eventType, expectedLabel) => {
    const deliveryEvent = buildDeliveryEvent({
      event_type: eventType,
    });
    const model = buildProposalNarrativePostureModel({
      ...activeProposal,
      events: activeEvents({
        latest_event: deliveryEvent,
        events: [deliveryEvent],
      }),
    });

    expect(model.latestEventLabel).toBe(expectedLabel);
    expect(model.eventCount).toBe(1);
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

  it("confirms the same review instant across equivalent timezone representations", () => {
    expect(() =>
      confirmNarrativeReviewRefresh({
        ...activeProposal,
        review: confirmedReview,
        refreshedReview: {
          ...confirmedReview,
          narrative_review: {
            ...confirmedReview.narrative_review,
            reviewed_at: "2026-05-22T17:00:00+08:00",
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects review timestamps that differ below JavaScript millisecond precision", () => {
    expect(() =>
      confirmNarrativeReviewRefresh({
        ...activeProposal,
        review: {
          ...confirmedReview,
          narrative_review: {
            ...confirmedReview.narrative_review,
            reviewed_at: "2026-05-22T09:00:00.1234Z",
          },
        },
        refreshedReview: {
          ...confirmedReview,
          narrative_review: {
            ...confirmedReview.narrative_review,
            reviewed_at: "2026-05-22T09:00:00.1235Z",
          },
        },
      }),
    ).toThrow("refreshed proposal evidence did not confirm it");
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

  it("confirms the same source-generated instant across equivalent timezone representations", () => {
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest({
          generated_at: "2026-05-22T09:01:00.41829Z",
        }),
        summary: discussionPackSummary({
          generated_at: "2026-05-22T17:01:00.418290+08:00",
        }),
        events: activeEvents(),
      }),
    ).not.toThrow();
  });

  it("confirms the original discussion-pack request after the proposal advances", () => {
    const advancedProposal = {
      ...activeProposalSummary,
      current_version_no: 3,
    };
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest(),
        summary: discussionPackSummary({}, advancedProposal),
        events: activeEvents({ proposal: advancedProposal }),
      }),
    ).not.toThrow();
  });

  it("keeps the original request confirmable after later non-report activity", () => {
    const implementationEvent = buildDeliveryEvent({
      event_id: "delivery-event-002",
      event_type: "EXECUTION_REQUESTED",
      occurred_at: "2026-05-22T09:02:00Z",
      reason: {},
    });
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest(),
        summary: discussionPackSummary(),
        events: activeEvents({
          event_count: 2,
          latest_event: implementationEvent,
          events: [buildDeliveryEvent(), implementationEvent],
        }),
      }),
    ).not.toThrow();
  });

  it("accepts an async accepted action that refreshes monotonically to a ready package", () => {
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest(),
        summary: discussionPackSummary({
          status: "READY",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-22T09:01:00Z",
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        }),
        events: activeEvents(),
      }),
    ).not.toThrow();
  });

  it("accepts a legacy requested action that refreshes to source acceptance", () => {
    expect(() =>
      confirmDiscussionPackRefresh({
        ...activeProposal,
        report: discussionPackRequest({
          status: "REQUESTED",
          explanation: {
            related_version_no: 2,
            include_reviewed_narrative: true,
            proposal_narrative_package: {
              package_status: "REQUESTED",
              source_narrative_hash: "sha256:narrative-001",
            },
          },
        }),
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
    [
      "rejected action package review",
      discussionPackRequest({
        explanation: {
          related_version_no: 2,
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "REQUESTED",
            review_state: "REJECTED",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      }),
      discussionPackSummary(),
      activeEvents(),
    ],
    [
      "incomplete ready action",
      discussionPackRequest({
        status: "READY",
        report_reference_id: undefined,
        generated_at: undefined,
        explanation: {
          related_version_no: 2,
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      }),
      discussionPackSummary(),
      activeEvents(),
    ],
    ["stale request", discussionPackRequest(), discussionPackSummary({ report_request_id: "report-old" }), activeEvents()],
    ["padded action request", discussionPackRequest({ report_request_id: " report-001 " }), discussionPackSummary(), activeEvents()],
    ["padded summary request", discussionPackRequest(), discussionPackSummary({ report_request_id: " report-001 " }), activeEvents()],
    [
      "consistently padded request identity",
      discussionPackRequest({ report_request_id: " report-001 " }),
      discussionPackSummary({ report_request_id: " report-001 " }),
      activeSingleEvent({
        reason: { report_request_id: " report-001 " },
      }),
    ],
    [
      "stale delivery request identity",
      discussionPackRequest(),
      discussionPackSummary(),
      activeSingleEvent({ reason: { report_request_id: "report-old" } }),
    ],
    [
      "requested action with malformed artifact timestamp",
      discussionPackRequest({ generated_at: "not-a-time" }),
      discussionPackSummary(),
      activeEvents(),
    ],
    [
      "ready action regresses to accepted",
      discussionPackRequest({
        status: "READY",
        report_reference_id: "report-document-001",
        generated_at: "2026-05-22T09:01:00Z",
        explanation: {
          related_version_no: 2,
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      }),
      discussionPackSummary(),
      activeEvents(),
    ],
    [
      "ready artifact reference changes",
      discussionPackRequest({
        status: "READY",
        report_reference_id: "artifact-a",
        generated_at: "2026-05-22T09:01:00Z",
        explanation: {
          related_version_no: 2,
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      }),
      discussionPackSummary({
        status: "READY",
        report_reference_id: "artifact-b",
        generated_at: "2026-05-22T09:01:00Z",
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
      activeEvents(),
    ],
    [
      "ready artifact timestamp changes",
      discussionPackRequest({
        status: "READY",
        report_reference_id: "artifact-a",
        generated_at: "2026-05-22T09:01:00Z",
        explanation: {
          related_version_no: 2,
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      }),
      discussionPackSummary({
        status: "READY",
        report_reference_id: "artifact-a",
        generated_at: "2026-05-22T09:02:00Z",
        proposal_narrative_package: {
          related_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      }),
      activeEvents(),
    ],
    ["wrong proposal", discussionPackRequest(), discussionPackSummary({}, { ...activeProposalSummary, proposal_id: "pp_2" }), activeEvents()],
    ["summary snapshot predates the action", discussionPackRequest(), discussionPackSummary({}, { ...activeProposalSummary, current_version_no: 1 }), activeEvents()],
    ["wrong events", discussionPackRequest(), discussionPackSummary(), activeEvents({ proposal: { ...activeProposalSummary, current_version_no: 1 } })],
    [
      "matching request on another version",
      discussionPackRequest(),
      discussionPackSummary({}, { ...activeProposalSummary, current_version_no: 3 }),
      activeSingleEvent({
        related_version_no: 3,
        reason: { report_request_id: "report-001" },
      }),
    ],
    [
      "request identity reused on a later version",
      discussionPackRequest(),
      discussionPackSummary({}, { ...activeProposalSummary, current_version_no: 3 }),
      activeEvents({
        proposal: { ...activeProposalSummary, current_version_no: 3 },
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          related_version_no: 3,
          occurred_at: "2026-05-22T09:02:00Z",
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            related_version_no: 3,
            occurred_at: "2026-05-22T09:02:00Z",
          }),
        ],
      }),
    ],
    [
      "duplicate canonical request event",
      discussionPackRequest(),
      discussionPackSummary(),
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          occurred_at: "2026-05-22T09:02:00Z",
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            occurred_at: "2026-05-22T09:02:00Z",
          }),
        ],
      }),
    ],
    [
      "later request supersedes the original on the same version",
      discussionPackRequest(),
      discussionPackSummary(),
      activeEvents({
        event_count: 2,
        latest_event: buildDeliveryEvent({
          event_id: "delivery-event-002",
          occurred_at: "2026-05-22T09:02:00Z",
          reason: { report_request_id: "report-002" },
        }),
        events: [
          buildDeliveryEvent(),
          buildDeliveryEvent({
            event_id: "delivery-event-002",
            occurred_at: "2026-05-22T09:02:00Z",
            reason: { report_request_id: "report-002" },
          }),
        ],
      }),
    ],
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
