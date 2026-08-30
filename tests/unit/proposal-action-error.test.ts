import { describe, expect, it } from "vitest";

import {
  ProposalActionBusinessError,
  proposalActionFailureCopy,
  proposalActionFailureSupportEvidence,
} from "../../src/features/proposals/proposal-action-error";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

describe("proposal action failure copy", () => {
  it.each([401, 403])(
    "keeps permission response %s explicit without exposing transport copy",
    (status) => {
      const error = new WorkbenchApiError("proposal request", status);

      expect(proposalActionFailureCopy(error, "save_draft")).toBe(
        "This proposal action is not available for your current access. No proposal change was recorded.",
      );
      expect(proposalActionFailureCopy(error, "save_draft")).not.toContain(
        error.message,
      );
    },
  );

  it("distinguishes a missing historical version from an unavailable source", () => {
    expect(
      proposalActionFailureCopy(
        new WorkbenchApiError("proposal version", 404),
        "load_version",
      ),
    ).toBe("That proposal version is not available in the current history.");
  });

  it("requires source refresh after a conflict", () => {
    expect(
      proposalActionFailureCopy(
        new WorkbenchApiError("proposal request", 409),
        "create_version",
      ),
    ).toContain("Refresh current evidence");
  });

  it("uses action-specific business recovery for untyped failures", () => {
    expect(
      proposalActionFailureCopy(
        new Error("gateway host and raw response body"),
        "evaluate_draft",
      ),
    ).toBe(
      "The proposal could not be evaluated from the current source evidence. Confirm portfolio holdings and try again.",
    );
  });

  it("preserves only explicitly classified local business guidance", () => {
    const businessFailure = new ProposalActionBusinessError(
      "The source action completed, but refreshed evidence could not be confirmed.",
    );
    const lookAlikeTransportFailure = new Error(
      "The source action exposed INTERNAL_SOURCE_DETAIL",
    );

    expect(proposalActionFailureCopy(businessFailure, "advance_proposal")).toBe(
      businessFailure.message,
    );
    expect(
      proposalActionFailureCopy(lookAlikeTransportFailure, "advance_proposal"),
    ).toBe(
      "The proposal action could not be completed. Review the current posture and try again.",
    );
  });

  it("keeps source request evidence out of primary business copy", () => {
    const error = new WorkbenchApiError(
      "proposal request",
      403,
      "corr-proposal-denied-001",
    );

    expect(proposalActionFailureCopy(error, "save_draft")).toBe(
      "This proposal action is not available for your current access. No proposal change was recorded.",
    );
    expect(proposalActionFailureCopy(error, "save_draft")).not.toContain(
      "corr-proposal-denied-001",
    );
    expect(proposalActionFailureSupportEvidence(error)).toEqual({
      requestReference: "corr-proposal-denied-001",
      status: "403",
    });
  });
});
