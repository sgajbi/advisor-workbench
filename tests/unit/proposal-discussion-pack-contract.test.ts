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
