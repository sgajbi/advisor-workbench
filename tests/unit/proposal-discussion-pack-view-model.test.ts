import { describe, expect, it } from "vitest";

import { buildProposalDiscussionPackModel } from "../../src/features/proposals/proposal-discussion-pack-view-model";
import { proposalDiscussionPackFixture } from "../fixtures/proposal-discussion-pack";

describe("proposal discussion pack view model", () => {
  it("keeps advisor review separate from client release and consent", () => {
    const model = buildProposalDiscussionPackModel(
      proposalDiscussionPackFixture(),
    );

    expect(model.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "narrative",
          status: "Approved for advisor use",
        }),
        expect.objectContaining({ key: "consent", status: "Not recorded" }),
        expect.objectContaining({ key: "release", status: "Blocked" }),
      ]),
    );
    expect(model.posture.label).toBe("Review required");
    expect(model.posture.title).not.toMatch(/client[- ]ready/i);
  });

  it("surfaces partial source support without inventing readiness", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.overall_state = "partial";
    envelope.data.narrative.state = "restricted";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.posture.label).toBe("Evidence incomplete");
    expect(model.controls[0]).toMatchObject({
      status: "Restricted",
      tone: "danger",
      source: "Source not confirmed",
    });
  });

  it("presents narrative, memo, disclosure, and lineage facts for scan and drill-in", () => {
    const model = buildProposalDiscussionPackModel(
      proposalDiscussionPackFixture(),
    );

    expect(model.narrative.sections[0]).toMatchObject({
      title: "Conversation opening",
      sourceCount: 1,
      limitationCount: 1,
    });
    expect(model.memo.sections[0]?.title).toBe("Decision summary");
    expect(model.disclosures[0]).toMatchObject({
      audience: "Client-ready material",
      jurisdiction: "SG",
    });
    expect(model.lineage).toMatchObject({
      contractVersion: "proposal-discussion-pack-review.v1",
      proposalVersionId: "proposal-version-2",
    });
    expect(model.narrative.aiDisclosure).toMatchObject({
      preparation: "deterministic",
      availability: "live",
      clientUse: "blocked",
      evidence: { state: "supported", sourceCount: 1 },
      humanReview: { state: "reviewed", sourceRecorded: true },
    });
  });

  it("does not relabel an available report package as released or delivered", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.package = {
      state: "supported",
      reason_code: "report_package_available",
      package_state: "available",
      report_request_id: "report-request-2",
      report_reference_id: "report-2",
      generated_at: "2026-08-21T09:30:00Z",
      related_version_no: 2,
      includes_reviewed_narrative: true,
      source_service: "lotus-report",
    };

    const model = buildProposalDiscussionPackModel(envelope);
    const report = model.controls.find(({ key }) => key === "package");

    expect(report).toMatchObject({
      status: "Available",
      source: "Lotus Report",
    });
    expect(report?.summary).not.toMatch(/released|delivered/i);
  });

  it("keeps a partial available package out of the confirmed control count", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.overall_state = "partial";
    envelope.data.package = {
      state: "partial",
      reason_code: "report_package_for_historical_version",
      package_state: "available",
      report_request_id: "report-request-1",
      report_reference_id: "report-1",
      generated_at: "2026-08-20T09:30:00Z",
      related_version_no: 1,
      includes_reviewed_narrative: true,
      source_service: "lotus-report",
    };

    const model = buildProposalDiscussionPackModel(envelope);
    const report = model.controls.find(({ key }) => key === "package");

    expect(report).toMatchObject({
      status: "Partial",
      tone: "warn",
      source: "Source not confirmed",
    });
    expect(model.controls.filter(({ tone }) => tone === "success")).toHaveLength(2);
  });

  it("projects AI-assisted narrative through the governed disclosure model", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.narrative.isAiAssisted).toBe(true);
    expect(model.narrative.aiDisclosure).toMatchObject({
      scopeLabel: "Advisor conversation narrative",
      preparation: "ai-assisted",
      availability: "live",
      clientUse: "blocked",
      freshness: { state: "current", asOf: "2026-08-21T08:30:00Z" },
    });
    expect(model.narrative.aiDisclosure.limitations).toContain(
      "Client-ready publication is not supported.",
    );
  });
});
