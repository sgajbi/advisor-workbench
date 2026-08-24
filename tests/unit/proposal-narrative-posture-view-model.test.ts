import { describe, expect, it } from "vitest";

import {
  buildProposalNarrativePostureModel,
  formatEvidenceHash,
} from "../../src/features/proposals/proposal-narrative-posture-view-model";

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
    expect(model.latestEventLabel).toBe("No Delivery Event");
  });

  it("shortens long evidence hashes for dense UI display", () => {
    expect(formatEvidenceHash("sha256:1234567890abcdef1234567890abcdef")).toBe(
      "sha256:123456789...90abcdef"
    );
    expect(formatEvidenceHash(null)).toBe("Not available");
  });
});
