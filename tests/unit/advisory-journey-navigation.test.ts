import { describe, expect, it } from "vitest";

import {
  ADVISORY_JOURNEY_DEFINITIONS,
  buildAdvisoryJourneyHref,
  buildAdvisoryJourneyModeItems,
  getAdvisoryJourneyDefinition,
  normalizeAdvisoryJourneyMode,
} from "../../src/features/proposals/advisory-journey-navigation";

describe("advisory journey navigation", () => {
  it("normalizes requested modes into governed advisory journey screens", () => {
    expect(normalizeAdvisoryJourneyMode("RISK-IMPACT")).toBe("risk-impact");
    expect(normalizeAdvisoryJourneyMode(" proposal-builder ")).toBe(
      "proposal-builder",
    );
    expect(normalizeAdvisoryJourneyMode("technical-route")).toBe("overview");
    expect(normalizeAdvisoryJourneyMode("simulation")).toBe("overview");
    expect(normalizeAdvisoryJourneyMode(undefined)).toBe("overview");
  });

  it("builds portfolio-scoped routes without leaking service terminology into navigation", () => {
    const reviewContext = {
      portfolioId: "PB SG/001",
      asOfDate: "2026-06-30",
      period: "YTD" as const,
      reportingCurrency: "SGD",
      selectedRecordId: "proposal-123",
      batchId: "batch-456",
    };
    const governedQuery =
      "portfolioId=PB+SG%2F001&asOfDate=2026-06-30&period=YTD&reportingCurrency=SGD";

    expect(buildAdvisoryJourneyHref(reviewContext, "overview")).toBe(
      `/recommendations?${governedQuery}`,
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "cockpit")).toBe(
      `/recommendations?${governedQuery}&mode=cockpit`,
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "copilot")).toBe(
      `/recommendations?${governedQuery}&mode=copilot`,
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "proposal-builder")).toBe(
      `/proposals/simulate?${governedQuery}`,
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "risk-impact")).toBe(
      `/proposals?${governedQuery}&mode=risk-impact`,
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "proof")).toBe(
      `/recommendations?${governedQuery}&mode=proof`,
    );

    expect(buildAdvisoryJourneyHref(reviewContext, "proof")).not.toContain(
      "selectedRecordId",
    );
    expect(buildAdvisoryJourneyHref(reviewContext, "proof")).not.toContain(
      "batchId",
    );
  });

  it("builds dense shell-visible journey items with one active mode", () => {
    const items = buildAdvisoryJourneyModeItems(
      {
        portfolioId: "PB_1",
        asOfDate: "2026-06-30",
        period: "3Y",
        reportingCurrency: "USD",
      },
      "approval-queue",
    );

    expect(items.map((item) => item.key)).toEqual([
      "overview",
      "cockpit",
      "copilot",
      "opportunities",
      "proposal-builder",
      "suitability",
      "risk-impact",
      "approval-queue",
      "discussion-pack",
      "implementation",
      "proof",
    ]);
    expect(items.filter((item) => item.active).map((item) => item.key)).toEqual(
      ["approval-queue"],
    );
    expect(items.find((item) => item.key === "proposal-builder")).toMatchObject(
      {
        label: "Builder",
        detail: "Draft trades",
        href:
          "/proposals/simulate?portfolioId=PB_1&asOfDate=2026-06-30&period=3Y&reportingCurrency=USD",
      },
    );
    expect(items.some((item) => item.key === "simulation")).toBe(false);
    expect(items.every((item) => item.href?.includes("#simulation") !== true)).toBe(true);
  });

  it("keeps each journey definition anchored to advisor decisions and source-owned data", () => {
    expect(ADVISORY_JOURNEY_DEFINITIONS).toHaveLength(12);
    for (const definition of ADVISORY_JOURNEY_DEFINITIONS) {
      expect(definition.primaryDecision).toMatch(/\?$/);
      expect(definition.nextAction.length).toBeGreaterThan(10);
      expect(definition.dataSources).toContain("lotus-gateway");
    }
    const discussionPack = getAdvisoryJourneyDefinition("discussion-pack");
    expect(discussionPack.title).toBe("Discussion pack review");
    expect(
      `${discussionPack.description} ${discussionPack.primaryDecision} ${discussionPack.nextAction}`,
    ).not.toMatch(/client-ready/i);
    expect(
      getAdvisoryJourneyDefinition("implementation").description,
    ).toContain("Execution handoff");
    expect(getAdvisoryJourneyDefinition("proof").description).toContain(
      "supported claims",
    );
    const cockpit = getAdvisoryJourneyDefinition("cockpit");
    expect(cockpit.description).toBe(
      "Advisor priorities, preparation evidence, operating boundaries, and review posture.",
    );
    expect(cockpit.description).not.toMatch(/gateway|supportability|rfc|api/i);
    expect(getAdvisoryJourneyDefinition("suitability").title).toBe(
      "Suitability review",
    );
    expect(getAdvisoryJourneyDefinition("risk-impact").title).toBe(
      "Risk and Impact",
    );
    expect(getAdvisoryJourneyDefinition("overview")).toMatchObject({
      detail: "Adviser priorities",
      description:
        "Prioritise open proposals and continue the next permitted advisory action.",
    });
  });
});
