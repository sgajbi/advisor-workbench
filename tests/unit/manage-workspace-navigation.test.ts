import { describe, expect, it } from "vitest";

import {
  buildManageModeHref,
  buildManageModeItems,
  getManageModeDefinition,
  normalizeManageMode,
} from "../../src/features/workbench/manage-workspace-navigation";

describe("manage workspace navigation", () => {
  it("normalizes unknown or mixed-case requested modes to governed manage modes", () => {
    expect(normalizeManageMode("WAVES")).toBe("waves");
    expect(normalizeManageMode(" quality ")).toBe("quality");
    expect(normalizeManageMode("client-contact")).toBe("overview");
    expect(normalizeManageMode(undefined)).toBe("overview");
  });

  it("builds stable manage mode links without leaking raw routing policy into the page", () => {
    const reviewContext = {
      portfolioId: "PB SG/001",
      asOfDate: "2026-06-30",
      period: "3Y" as const,
      reportingCurrency: "SGD",
      selectedRecordId: "wave-123",
      batchId: "batch-456",
    };
    const governedQuery =
      "portfolioId=PB+SG%2F001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD";

    expect(buildManageModeHref(reviewContext, "overview")).toBe(
      `/workbench/PB%20SG%2F001?${governedQuery}`,
    );
    expect(buildManageModeHref(reviewContext, "proof")).toBe(
      `/workbench/PB%20SG%2F001?${governedQuery}&mode=proof`,
    );
    expect(buildManageModeHref(reviewContext, "proof")).not.toContain("selectedRecordId");
    expect(buildManageModeHref(reviewContext, "proof")).not.toContain("batchId");
  });

  it("builds dense rail items with one active front-office mode", () => {
    const items = buildManageModeItems({ portfolioId: "PB_1" }, "reviews");

    expect(items.map((item) => item.key)).toEqual([
      "overview",
      "mandate",
      "waves",
      "construction",
      "memory",
      "copilot",
      "quality",
      "reviews",
      "proof",
    ]);
    expect(items.filter((item) => item.active).map((item) => item.key)).toEqual(["reviews"]);
    expect(items.every((item) => item.prefetch === false)).toBe(true);
    expect(items.find((item) => item.key === "reviews")).toMatchObject({
      label: "Reviews",
      detail: "Outcome review",
      href: "/workbench/PB_1?portfolioId=PB_1&mode=reviews",
    });
  });

  it("keeps mode titles in private-banking language", () => {
    expect(getManageModeDefinition("mandate").title).toBe("Mandate Health");
    expect(getManageModeDefinition("copilot").title).toBe("PM Copilot");
    expect(getManageModeDefinition("reviews")).toMatchObject({
      title: "Outcome reviews",
      description:
        "Post-rebalance expected-versus-realised comparison and evidence review.",
    });
    expect(getManageModeDefinition("construction").description).toBe(
      "Supported construction alternatives for advisor and PM review."
    );
  });
});
