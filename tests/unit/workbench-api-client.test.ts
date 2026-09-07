import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildServerGatewayHeaders,
  getWorkbenchApiErrorEvidence,
  getWorkbenchApiErrorStatus,
  fetchWorkbenchJson,
  isWorkbenchPermissionBlockedError,
  WorkbenchApiError,
} from "@/features/workbench/api-client";

describe("workbench API error classification", () => {
  const originalEnvironment = process.env.LOTUS_ENVIRONMENT;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnvironment === undefined) {
      delete process.env.LOTUS_ENVIRONMENT;
    } else {
      process.env.LOTUS_ENVIRONMENT = originalEnvironment;
    }
  });

  it("builds direct Gateway authority only for explicit development posture", () => {
    process.env.LOTUS_ENVIRONMENT = "test";

    const headers = buildServerGatewayHeaders();

    expect(headers.get("X-Actor-Id")).toBe("workbench-system");
    expect(headers.get("X-Tenant-Id")).toBe("tenant-sg");
  });

  it.each([undefined, "uat", "production"])(
    "rejects direct Gateway authority in %s posture",
    (environment) => {
      if (environment === undefined) {
        delete process.env.LOTUS_ENVIRONMENT;
      } else {
        process.env.LOTUS_ENVIRONMENT = environment;
      }

      expect(() => buildServerGatewayHeaders()).toThrowError(
        expect.objectContaining({ status: 401 }),
      );
    },
  );

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

  it("retains a validated source request reference without reading the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"detail":"INTERNAL_SOURCE_DETAIL"}', {
          status: 403,
          headers: { "X-Correlation-Id": "corr-proposal-denied-001" },
        })
      )
    );

    const failure = await fetchWorkbenchJson("/api/bff/proposals/1", "proposal")
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(WorkbenchApiError);
    expect(failure).toMatchObject({
      status: 403,
      requestReference: "corr-proposal-denied-001",
    });
    expect(getWorkbenchApiErrorEvidence(failure)).toEqual({
      label: "HTTP status",
      value: "403",
      requestReference: "corr-proposal-denied-001",
    });
    expect((failure as Error).message).not.toContain("INTERNAL_SOURCE_DETAIL");
  });

  it("preserves typed status evidence when an adapter response omits headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response)
    );

    const failure = await fetchWorkbenchJson("/api/bff/proposals/1", "proposal")
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(WorkbenchApiError);
    expect(failure).toMatchObject({ status: 403, requestReference: null });
    expect(getWorkbenchApiErrorEvidence(failure)).toEqual({
      label: "HTTP status",
      value: "403",
    });
  });

  it("drops malformed response references instead of presenting untrusted support text", () => {
    const evidence = getWorkbenchApiErrorEvidence(
      new WorkbenchApiError("proposal", 403, "reference with spaces")
    );

    expect(evidence).toEqual({ label: "HTTP status", value: "403" });
  });
});
