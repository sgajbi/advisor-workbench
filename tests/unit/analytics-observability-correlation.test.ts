import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAnalyticsUiCorrelationHeaders,
  isValidAnalyticsUiTraceparent,
} from "../../src/features/analytics-observability/correlation";

describe("analytics UI correlation headers", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("creates and preserves route-scoped browser correlation context", () => {
    const first = buildAnalyticsUiCorrelationHeaders(undefined, "performance-workspace");
    const second = buildAnalyticsUiCorrelationHeaders(undefined, "performance-workspace");

    expect(first.get("X-Correlation-Id")).toMatch(/^corr-workbench-[0-9a-f]{16}$/);
    expect(first.get("X-Correlation-Id")).toBe(second.get("X-Correlation-Id"));
    expect(isValidAnalyticsUiTraceparent(first.get("traceparent"))).toBe(true);
    expect(first.get("traceparent")).toBe(second.get("traceparent"));
    expect(first.get("X-Trace-Id")).toBe(first.get("traceparent")?.split("-")[1]);
  });

  it("preserves valid incoming context for BFF requests", () => {
    const headers = buildAnalyticsUiCorrelationHeaders(
      {
        "X-Correlation-Id": "corr-existing",
        traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
      },
      "performance-workspace"
    );

    expect(headers.get("X-Correlation-Id")).toBe("corr-existing");
    expect(headers.get("traceparent")).toBe(
      "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"
    );
    expect(headers.get("X-Trace-Id")).toBe("0123456789abcdef0123456789abcdef");
  });

  it("does not emit malformed traceparent headers", () => {
    const headers = buildAnalyticsUiCorrelationHeaders(
      {
        "X-Correlation-Id": "corr-existing",
        traceparent: "not-a-valid-traceparent",
      },
      "risk-workspace"
    );

    expect(headers.get("traceparent")).not.toBe("not-a-valid-traceparent");
    expect(isValidAnalyticsUiTraceparent(headers.get("traceparent"))).toBe(true);
  });

  it("uses a valid X-Trace-Id when replacing malformed traceparent headers", () => {
    const headers = buildAnalyticsUiCorrelationHeaders(
      {
        "X-Trace-Id": "fedcba9876543210fedcba9876543210",
        traceparent: "not-a-valid-traceparent",
      },
      "risk-workspace"
    );

    expect(headers.get("X-Trace-Id")).toBe("fedcba9876543210fedcba9876543210");
    expect(headers.get("traceparent")).toMatch(
      /^00-fedcba9876543210fedcba9876543210-[0-9a-f]{16}-[0-9a-f]{2}$/
    );
  });
});
