import { describe, expect, it } from "vitest";

import { parseProposalDiscussionPackEnvelope } from "../../src/features/proposals/proposal-discussion-pack-contract";
import { proposalDiscussionPackFixture } from "../fixtures/proposal-discussion-pack";

const SELECTED = [
  "proposal-1",
  "PB_SG_GLOBAL_BAL_001",
  2,
  "AWAITING_CLIENT_CONSENT",
] as const;

describe("proposal discussion pack contract", () => {
  it("binds a source-backed pack to the selected proposal and version", () => {
    const result = parseProposalDiscussionPackEnvelope(
      proposalDiscussionPackFixture(),
      ...SELECTED,
    );

    expect(result.data.narrative.sections[0]?.title).toBe(
      "Conversation opening",
    );
    expect(result.data.client_release).toMatchObject({
      publication_supported: false,
      delivery_supported: false,
    });
  });

  it.each([
    ["proposal", "different-proposal"],
    ["portfolio", "different-portfolio"],
  ])("rejects %s identity drift", (identity, changed) => {
    const fixture = proposalDiscussionPackFixture();
    if (identity === "proposal") fixture.data.proposal_id = changed;
    else fixture.data.portfolio_id = changed;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow(
      `Proposal discussion pack contract is invalid: ${identity} identity changed`,
    );
  });

  it("rejects lifecycle or immutable version drift", () => {
    const version = proposalDiscussionPackFixture();
    version.data.version_no = 3;
    expect(() =>
      parseProposalDiscussionPackEnvelope(version, ...SELECTED),
    ).toThrow("proposal version changed");

    const lifecycle = proposalDiscussionPackFixture();
    lifecycle.data.current_state = "EXECUTION_READY";
    expect(() =>
      parseProposalDiscussionPackEnvelope(lifecycle, ...SELECTED),
    ).toThrow("proposal lifecycle changed");
  });

  it("rejects any source claim that publication or delivery is supported", () => {
    const fixture = proposalDiscussionPackFixture() as unknown as {
      data: { client_release: { publication_supported: boolean } };
    };
    fixture.data.client_release.publication_supported = true;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("client_release.publication_supported must remain false");
  });

  it("rejects duplicated capability evidence", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.capabilities[1] = fixture.data.capabilities[0]!;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("capability keys are duplicated");
  });

  it("rejects an incomplete capability registry", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.capabilities.pop();

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("capability registry is incomplete");
  });

  it.each([
    ["report package", "package"],
    ["client consent", "consent"],
  ] as const)("rejects %s evidence for another proposal version", (label, key) => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data[key].related_version_no = 1;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow(`${label} is not correlated to the selected version`);
  });

  it("requires package and consent records to identify the selected version", () => {
    const packageFixture = proposalDiscussionPackFixture();
    packageFixture.data.package.package_state = "available";
    expect(() =>
      parseProposalDiscussionPackEnvelope(packageFixture, ...SELECTED),
    ).toThrow("report package is not correlated to the selected version");

    const consentFixture = proposalDiscussionPackFixture();
    consentFixture.data.consent.consent_state = "approved";
    expect(() =>
      parseProposalDiscussionPackEnvelope(consentFixture, ...SELECTED),
    ).toThrow("client consent is not correlated to the selected version");
  });

  it("requires an available package to carry its source reference", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.package = {
      state: "supported",
      reason_code: "report_package_available",
      package_state: "available",
      report_request_id: "report-request-2",
      report_reference_id: null,
      generated_at: "2026-08-21T09:30:00Z",
      related_version_no: 2,
      includes_reviewed_narrative: true,
      source_service: "lotus-report",
    };

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("available report package has no source reference");
  });

  it("rejects an available package that is not source-supported", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.package = {
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

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("available report package is not source-supported");
  });

  it.each([
    ["narrative"],
    ["memo"],
  ] as const)("requires a complete source audit for approved %s evidence", (key) => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data[key].reviewed_at = null;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow(`approved ${key} has no complete source review record`);
  });

  it("requires a complete source record for confirmed consent", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.consent = {
      state: "supported",
      reason_code: "client_consent_approved",
      consent_state: "approved",
      approval_id: "approval-2",
      actor_id: null,
      occurred_at: "2026-08-21T09:40:00Z",
      related_version_no: 2,
    };

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("client consent has no complete source record");
  });

  it.each([
    ["narrative", "sha256:different-narrative"],
    ["memo", "sha256:different-memo"],
  ] as const)("rejects a %s artifact hash that disagrees with lineage", (key, hash) => {
    const fixture = proposalDiscussionPackFixture();
    if (key === "narrative") fixture.data.narrative.source_narrative_hash = hash;
    else fixture.data.memo.memo_hash = hash;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow(`${key} artifact hash does not match lineage`);
  });

  it("requires usable source content before accepting narrative approval", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.narrative.sections[0]!.source_refs = [];

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("supported narrative has no complete source artifact");
  });

  it("requires a complete memo artifact before accepting memo approval", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.memo.memo_id = null;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("supported memo has no complete source artifact");
  });

  it("rejects approved narrative that is not ready for advisor review", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.narrative.status = "BLOCKED_POLICY_INCOMPLETE";

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("approved narrative is not ready for advisor review");
  });

  it("rejects approved memo whose source sections are not finalized", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.memo.sections[0]!.review_required = true;

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("approved memo is not finalized for advisor use");
  });

  it("rejects capability posture that contradicts source evidence", () => {
    const fixture = proposalDiscussionPackFixture();
    const narrativeCapability = fixture.data.capabilities.find(
      ({ key }) => key === "advisor_narrative",
    )!;
    narrativeCapability.state = "partial";

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("capability registry does not match source evidence");
  });

  it("requires a complete source record for an available report package", () => {
    const fixture = proposalDiscussionPackFixture();
    fixture.data.package = {
      state: "supported",
      reason_code: "report_package_available",
      package_state: "available",
      report_request_id: "report-request-2",
      report_reference_id: "report-2",
      generated_at: null,
      related_version_no: 2,
      includes_reviewed_narrative: true,
      source_service: "lotus-report",
    };

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("available report package has no complete source record");
  });

  it("rejects unknown closed-enum source states", () => {
    const fixture = proposalDiscussionPackFixture() as unknown as {
      data: { consent: { consent_state: string } };
    };
    fixture.data.consent.consent_state = "assumed";

    expect(() =>
      parseProposalDiscussionPackEnvelope(fixture, ...SELECTED),
    ).toThrow("consent.consent_state is not supported");
  });
});
