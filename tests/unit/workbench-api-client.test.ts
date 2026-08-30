import { describe, expect, it } from "vitest";

import {
  getWorkbenchApiErrorEvidence,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
  WorkbenchApiError,
} from "@/features/workbench/api-client";

describe("workbench API error classification", () => {
  it.each([401, 403])("recognizes typed permission response %s", (status) => {
    expect(
      isWorkbenchPermissionBlockedError(
        new WorkbenchApiError("proposal list", status),
      )
    ).toBe(true);
  });

  it("does not recover authority from an untyped error message", () => {
    const error = new Error(
      'Proposal list failed (403): {"detail":"forbidden"}'
    );

    expect(getWorkbenchApiErrorStatus(error)).toBeNull();
    expect(isWorkbenchPermissionBlockedError(error)).toBe(false);
  });

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
