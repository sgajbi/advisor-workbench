import { describe, expect, it } from "vitest";

import {
  PROPOSAL_DISCUSSION_PACK_COPY,
  PROPOSAL_DISCUSSION_PACK_STATE_COPY,
  proposalDiscussionCapabilityLabel,
  proposalDiscussionCapabilityStateLabel,
  proposalDiscussionLimitationAreaLabel,
  proposalDiscussionMemoOwnerLabel,
  proposalDiscussionMemoStatusLabel,
  proposalDiscussionPackRefreshCopy,
  proposalDiscussionPackStatusCopy,
  proposalDiscussionProductTypeLabel,
  proposalDiscussionUsePurposeLabel,
} from "../../src/copy/proposal-discussion-pack-copy";

describe("Proposal Discussion Pack business copy", () => {
  it("owns the parent workspace and empty-state language", () => {
    expect(PROPOSAL_DISCUSSION_PACK_COPY.workspaceTitle).toBe(
      "Client meeting preparation",
    );
    expect(PROPOSAL_DISCUSSION_PACK_COPY.selectedRegionAriaLabel).toBe(
      "Selected discussion pack review",
    );
    expect(PROPOSAL_DISCUSSION_PACK_COPY.emptyTitle).toBe(
      "No discussion packs need review",
    );
    expect(
      `${PROPOSAL_DISCUSSION_PACK_COPY.workspaceSubtitle} ${PROPOSAL_DISCUSSION_PACK_COPY.emptyBody}`,
    ).not.toMatch(/gateway|source-owned|posture|advisor-use|client-ready/i);
  });

  it("follows the internal meeting-preparation decision sequence", () => {
    expect(PROPOSAL_DISCUSSION_PACK_COPY.navigation).toMatchObject({
      label: "Discussion pack",
      detail: "Meeting material",
      title: "Discussion pack review",
      primaryDecision:
        "What remains before this material can support a client discussion?",
    });
    expect(PROPOSAL_DISCUSSION_PACK_COPY).toMatchObject({
      decisionLabel: "Meeting decision",
      controlsTitle: "Client-discussion checklist",
      narrativeTitle: "Adviser conversation narrative",
      memoTitle: "Adviser decision memo",
    });
  });

  it("keeps internal preparation separate from external use", () => {
    expect(proposalDiscussionPackStatusCopy("internal-ready")).toEqual({
      label: "Internal review complete",
      title: "Meeting material is ready for internal use",
      summary:
        "The current narrative, decision memo, report package and consent record are available for this proposal version. Client release still requires separate approval.",
      nextAction:
        "Use this version for internal meeting preparation and confirm release approval before any external use.",
    });
    expect(PROPOSAL_DISCUSSION_PACK_COPY.boundaryNote).toContain(
      "do not authorise publication",
    );
  });

  it("gives incomplete and action-required states a recovery step", () => {
    expect(proposalDiscussionPackStatusCopy("incomplete")).toMatchObject({
      label: "Information incomplete",
      title: "Complete the discussion pack before use",
      summary: expect.stringContaining("Confirmed items remain available"),
      nextAction: expect.stringContaining("Resolve the unavailable information"),
    });
    expect(proposalDiscussionPackStatusCopy("action-required")).toMatchObject({
      label: "Action required",
      title: "Resolve the remaining client-discussion controls",
      nextAction: expect.stringContaining("Open the proposal record"),
    });
  });

  it("announces a completed update only after current material is available", () => {
    expect(
      proposalDiscussionPackRefreshCopy({
        state: "pending",
        hasConfirmedMaterial: true,
      }),
    ).toMatchObject({
      eyebrow: "Updating discussion pack",
      title: "Checking the current version",
    });
    expect(
      proposalDiscussionPackRefreshCopy({
        state: "confirmed",
        hasConfirmedMaterial: true,
      }),
    ).toEqual({
      eyebrow: "Discussion pack updated",
      title: "Current version available",
      message: undefined,
    });
  });

  it("distinguishes retained material from a failed initial update", () => {
    expect(
      proposalDiscussionPackRefreshCopy({
        state: "failed",
        hasConfirmedMaterial: true,
      }).message,
    ).toContain("Earlier confirmed material remains visible");
    expect(
      proposalDiscussionPackRefreshCopy({
        state: "failed",
        hasConfirmedMaterial: false,
      }).message,
    ).toBe("No current discussion pack is available. Retry before continuing.");
  });

  it("maps known source values and fails unknown values closed", () => {
    expect(proposalDiscussionCapabilityLabel("advisor_narrative")).toBe(
      "Conversation narrative",
    );
    expect(proposalDiscussionCapabilityStateLabel("supported")).toBe("Available");
    expect(proposalDiscussionMemoStatusLabel("PENDING_REVIEW")).toBe(
      "Review required",
    );
    expect(proposalDiscussionMemoOwnerLabel("ADVISOR")).toBe("Adviser");
    expect(proposalDiscussionProductTypeLabel("MULTI_ASSET")).toBe("Multi-asset");
    expect(proposalDiscussionLimitationAreaLabel("report_archive_lineage")).toBe(
      "Released document record",
    );
    expect(proposalDiscussionUsePurposeLabel("CLIENT_READY")).toBe(
      "Client-use review",
    );

    expect(proposalDiscussionCapabilityLabel("NEW_CAPABILITY")).toBe(
      "Additional control",
    );
    expect(proposalDiscussionCapabilityStateLabel("NEW_STATE")).toBe(
      "Review required",
    );
    expect(proposalDiscussionMemoStatusLabel("NEW_STATUS")).toBe(
      "Review required",
    );
    expect(proposalDiscussionMemoOwnerLabel("NEW_OWNER")).toBe(
      "Owner not reported",
    );
    expect(proposalDiscussionProductTypeLabel("NEW_PRODUCT")).toBe(
      "Product type not reported",
    );
    expect(proposalDiscussionLimitationAreaLabel("NEW_RECORD")).toBe(
      "Supporting record",
    );
    expect(proposalDiscussionUsePurposeLabel("NEW_PURPOSE")).toBe(
      "Client-use review",
    );
  });

  it("keeps transport and engineering vocabulary out of productive copy", () => {
    const productiveCopy = JSON.stringify({
      staticCopy: PROPOSAL_DISCUSSION_PACK_COPY,
      stateCopy: PROPOSAL_DISCUSSION_PACK_STATE_COPY,
      incomplete: proposalDiscussionPackStatusCopy("incomplete"),
      actionRequired: proposalDiscussionPackStatusCopy("action-required"),
      internalReady: proposalDiscussionPackStatusCopy("internal-ready"),
      refreshPending: proposalDiscussionPackRefreshCopy({
        state: "pending",
        hasConfirmedMaterial: true,
      }),
      refreshFailed: proposalDiscussionPackRefreshCopy({
        state: "failed",
        hasConfirmedMaterial: true,
      }),
    });

    expect(productiveCopy).not.toMatch(
      /gateway|bff|source[- ](?:owned|confirmed|backed)|supportability|posture|governed|inferred|http status|rfc-\d+/i,
    );
  });
});
