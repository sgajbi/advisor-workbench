import { describe, expect, it } from "vitest";

import {
  PROPOSAL_MEMO_ACTION_FAILURE_COPY,
  proposalMemoActionSuccessCopy,
  proposalMemoRefreshFailureCopy,
} from "../../src/copy/proposal-memo-copy";

describe("proposal memo copy", () => {
  it("keeps current-version recovery precise and action-specific", () => {
    expect(
      proposalMemoRefreshFailureCopy({
        action: "review",
        currentVersionNo: 2,
        historicalEvidenceUnavailable: false,
        versionNo: 2,
      }),
    ).toBe(
      "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
    );
  });

  it("keeps historical recovery separate from current-version work", () => {
    expect(
      proposalMemoRefreshFailureCopy({
        action: "review",
        currentVersionNo: 3,
        historicalEvidenceUnavailable: true,
        versionNo: 2,
      }),
    ).toBe(
      "Advisor review for proposal version 2 was recorded, but retained evidence for that version is unavailable. Current-version work remains available; recheck this earlier record before relying on it.",
    );
  });

  it("governs action outcomes outside the screen component", () => {
    expect(PROPOSAL_MEMO_ACTION_FAILURE_COPY.create).toContain("was not prepared");
    expect(proposalMemoActionSuccessCopy("report", 4)).toBe(
      "Discussion material confirmed for proposal version 4.",
    );
  });
});
