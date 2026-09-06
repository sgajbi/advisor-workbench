import { describe, expect, it } from "vitest";

import { isAmbiguousProposalCommandFailure } from "../../src/features/proposals/proposal-command-execution";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

describe("proposal command execution", () => {
  it.each([408, 429, 500, 503])(
    "retains exact recovery identity for ambiguous HTTP %s outcomes",
    (status) => {
      expect(isAmbiguousProposalCommandFailure(
        new WorkbenchApiError("proposal action", status),
      )).toBe(true);
    },
  );

  it.each([400, 401, 403, 404, 409, 422])(
    "does not retain recovery identity for deterministic HTTP %s rejection",
    (status) => {
      expect(isAmbiguousProposalCommandFailure(
        new WorkbenchApiError("proposal action", status),
      )).toBe(false);
    },
  );

  it("treats an unclassified transport failure as an uncertain outcome", () => {
    expect(isAmbiguousProposalCommandFailure(new Error("connection ended"))).toBe(true);
  });
});
