import { describe, expect, it } from "vitest";

import {
  getWorkbenchApiErrorEvidence,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
  WorkbenchApiError,
} from "@/features/workbench/api-client";

describe("workbench API error classification", () => {
  it.each([
    new WorkbenchApiError("proposal list", 403),
    new Error("Proposal list failed (401): authentication required"),
    new Error('Proposal list failed (403): {"detail":"forbidden"}'),
  ])(
    "recognizes permission responses without depending on message suffix shape",
    (error) => {
      expect(isWorkbenchPermissionBlockedError(error)).toBe(true);
    },
  );

  it("does not infer a status from unrelated numbers in an error message", () => {
    const error = new Error(
      "Proposal 403 failed without an HTTP status marker",
    );

    expect(getWorkbenchApiErrorStatus(error)).toBeNull();
    expect(isWorkbenchPermissionBlockedError(error)).toBe(false);
  });

  it("projects an HTTP status without inventing request-reference semantics", () => {
    const evidence = getWorkbenchApiErrorEvidence(
      new WorkbenchApiError("advisor book", 502),
    );

    expect(evidence).toEqual({ label: "HTTP status", value: "502" });
    expect(evidence).not.toHaveProperty("reference");
    expect(evidence).not.toHaveProperty("correlationId");
  });

  it("returns no operational evidence when the error has no HTTP status", () => {
    expect(getWorkbenchApiErrorEvidence(new Error("network unavailable"))).toBeNull();
  });
});
