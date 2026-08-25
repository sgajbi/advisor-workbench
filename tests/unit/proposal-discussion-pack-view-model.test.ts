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
          status: "Approved for adviser use",
        }),
        expect.objectContaining({ key: "consent", status: "Not recorded" }),
        expect.objectContaining({ key: "release", status: "Blocked" }),
      ]),
    );
    expect(model.status.label).toBe("Action required");
    expect(model.status.title).not.toMatch(/client[- ]ready/i);
  });

  it("surfaces partial source support without inventing readiness", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.overall_state = "partial";
    envelope.data.narrative.state = "restricted";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.status.label).toBe("Information incomplete");
    expect(model.controls[0]).toMatchObject({
      status: "Restricted",
      tone: "danger",
      source: "Current proposal version",
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
    expect(model.support.clientReleaseExplanation).toBe(
      "Advisor-use evidence is not authority to publish or deliver client material.",
    );
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
      source: "Report production record",
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
      status: "Incomplete",
      tone: "warn",
      source: "Current proposal version",
    });
    expect(model.controls.filter(({ tone }) => tone === "success")).toHaveLength(2);
  });

  it("keeps an unavailable package out of the confirmed control count", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.package = {
      state: "not_available",
      reason_code: "report_package_not_available",
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
      status: "Unavailable",
      tone: "default",
      source: "Current proposal version",
    });
    expect(model.controls.filter(({ tone }) => tone === "success")).toHaveLength(2);
  });

  it.each([
    ["narrative", "review_id"],
    ["memo", "review_event_id"],
  ] as const)(
    "does not confirm %s approval without a complete source review audit",
    (key, auditId) => {
      const envelope = proposalDiscussionPackFixture();
      if (key === "narrative" && auditId === "review_id") {
        envelope.data.narrative.review_id = null;
      } else if (key === "memo" && auditId === "review_event_id") {
        envelope.data.memo.review_event_id = null;
      }

      const model = buildProposalDiscussionPackModel(envelope);
      const control = model.controls.find(({ key: controlKey }) =>
        key === "narrative"
          ? controlKey === "narrative"
          : controlKey === "memo",
      );

      expect(control).toMatchObject({
        status: "Review evidence incomplete",
        tone: "warn",
        summary: "The approval state has no complete review record.",
      });
    },
  );

  it("does not confirm approved consent without its complete source record", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.consent = {
      state: "supported",
      reason_code: "client_consent_approved",
      consent_state: "approved",
      approval_id: "approval-2",
      actor_id: null,
      occurred_at: "2026-08-21T09:40:00Z",
      related_version_no: 2,
    };

    const model = buildProposalDiscussionPackModel(envelope);
    const consent = model.controls.find(({ key }) => key === "consent");

    expect(consent).toMatchObject({
      status: "Record incomplete",
      tone: "warn",
      summary:
        "The consent state has no complete approval, actor and date record.",
    });
  });

  it("projects AI-assisted narrative through the governed disclosure model", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.narrative.isAiAssisted).toBe(true);
    expect(model.narrative.aiDisclosure).toMatchObject({
      scopeLabel: "Adviser conversation narrative",
      preparation: "ai-assisted",
      availability: "live",
      clientUse: "blocked",
      freshness: { state: "not-reported" },
    });
    expect(model.narrative.aiDisclosure.limitations).toContain(
      "Client-ready publication is not supported.",
    );
  });

  it("does not infer aggregate success from contradictory source flags", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.overall_state = "supported";
    envelope.data.attention_required = false;
    envelope.data.narrative.review_state = "DRAFT";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.controls.find(({ key }) => key === "narrative")).toMatchObject({
      status: "Review required",
      tone: "warn",
    });
    expect(model.status).toMatchObject({
      label: "Action required",
      title: "Resolve the remaining client-discussion controls",
    });
  });

  it("does not confirm an available package that omits the reviewed narrative", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.package = {
      state: "supported",
      reason_code: "report_package_available",
      package_state: "available",
      report_request_id: "report-request-2",
      report_reference_id: "report-2",
      generated_at: "2026-08-21T09:30:00Z",
      related_version_no: 2,
      includes_reviewed_narrative: false,
      source_service: "lotus-report",
    };

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.controls.find(({ key }) => key === "package")).toMatchObject({
      status: "Narrative review missing",
      tone: "warn",
      source: "Report production record",
    });
    expect(model.status.label).toBe("Action required");
  });

  it("does not present incomplete approved narrative as available or reviewed", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.narrative.narrative_id = null;

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.narrative.isAvailable).toBe(false);
    expect(model.narrative.aiDisclosure).toMatchObject({
      availability: "unavailable",
      humanReview: { state: "unavailable", sourceRecorded: false },
    });
    expect(model.controls.find(({ key }) => key === "narrative")).toMatchObject({
      status: "Review evidence incomplete",
      tone: "warn",
    });
  });

  it.each(["proposal_identity", "disclosure_policy"] as const)(
    "keeps unsupported %s capability out of aggregate success",
    (key) => {
      const envelope = proposalDiscussionPackFixture();
      envelope.data.overall_state = "supported";
      envelope.data.attention_required = false;
      const capability = envelope.data.capabilities.find(
        (item) => item.key === key,
      )!;
      capability.state = "restricted";

      const model = buildProposalDiscussionPackModel(envelope);

      expect(model.status.label).toBe("Action required");
      if (key === "disclosure_policy") {
        const sourceBlocker = envelope.data.narrative.client_ready_blockers[0]!;
        const sourceLimitation = envelope.data.narrative.limitations[0]!.message;
        expect(model.disclosurePolicy).toMatchObject({
          isSupported: false,
          status: "Restricted",
          tone: "danger",
        });
        expect(model.disclosures).toEqual([]);
        expect(model.blockers).toEqual([
          "Disclosure requirements are unavailable for this proposal version.",
        ]);
        expect(model.limitations).toEqual([]);
        expect(model.narrative.aiDisclosure.limitations).not.toContain(
          sourceBlocker,
        );
        expect(model.narrative.aiDisclosure.limitations).not.toContain(
          sourceLimitation,
        );
      }
    },
  );

  it.each(["narrative", "memo"] as const)(
    "withholds %s lineage hash when source evidence is restricted",
    (key) => {
      const envelope = proposalDiscussionPackFixture();
      envelope.data[key].state = "restricted";

      const model = buildProposalDiscussionPackModel(envelope);

      expect(
        key === "narrative"
          ? model.lineage.narrativeHash
          : model.lineage.memoHash,
      ).toBeNull();
    },
  );

  it("redacts retained narrative provenance when source evidence is restricted", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.narrative.state = "restricted";
    envelope.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";
    const sourceBlocker = envelope.data.narrative.client_ready_blockers[0]!;
    const sourceLimitation = envelope.data.narrative.limitations[0]!.message;

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.narrative).toMatchObject({
      isAvailable: false,
      isAiAssisted: false,
      generationLabel: "Restricted",
      sections: [],
      reviewedBy: "Not available",
      reviewedAt: "Not available",
    });
    expect(model.narrative.aiDisclosure).toMatchObject({
      preparation: "unavailable",
      availability: "unavailable",
      evidence: { state: "missing", sourceCount: 0 },
      humanReview: { state: "unavailable", sourceRecorded: false },
    });
    expect(model.narrative.aiDisclosure.humanReview).not.toHaveProperty("actor");
    expect(model.narrative.aiDisclosure.humanReview).not.toHaveProperty(
      "occurredAt",
    );
    expect(model.blockers).toEqual([
      "Conversation narrative and preparation details are unavailable for this proposal version.",
    ]);
    expect(model.blockers).not.toContain(sourceBlocker);
    expect(model.limitations).toEqual([]);
    expect(model.narrative.aiDisclosure.limitations).not.toContain(
      sourceLimitation,
    );
  });

  it("replaces retained memo readiness with its restricted support posture", () => {
    const envelope = proposalDiscussionPackFixture();
    envelope.data.memo.state = "restricted";
    envelope.data.memo.memo_status = "READY";

    const model = buildProposalDiscussionPackModel(envelope);

    expect(model.memo).toMatchObject({
      isAvailable: false,
      status: "Restricted",
      tone: "danger",
      reviewedBy: "Not available",
      reviewedAt: "Not available",
      sections: [],
    });
  });

  it.each(["PENDING_REVIEW", "BLOCKED"] as const)(
    "uses a warning tone for an available memo with %s status",
    (status) => {
      const envelope = proposalDiscussionPackFixture();
      envelope.data.memo.memo_status = status;
      envelope.data.memo.latest_review_action = null;

      const model = buildProposalDiscussionPackModel(envelope);

      expect(model.memo).toMatchObject({
        isAvailable: true,
        status: status === "PENDING_REVIEW" ? "Review required" : "Blocked",
        tone: "warn",
      });
    },
  );
});
