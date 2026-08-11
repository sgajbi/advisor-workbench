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
    expect(buildAdvisoryJourneyHref("PB SG/001", "overview")).toBe(
      "/recommendations?portfolioId=PB%20SG%2F001",
    );
    expect(buildAdvisoryJourneyHref("PB SG/001", "cockpit")).toBe(
      "/recommendations?portfolioId=PB%20SG%2F001&mode=cockpit",
    );
    expect(buildAdvisoryJourneyHref("PB SG/001", "copilot")).toBe(
      "/recommendations?portfolioId=PB%20SG%2F001&mode=copilot",
    );
    expect(buildAdvisoryJourneyHref("PB SG/001", "proposal-builder")).toBe(
      "/proposals/simulate?portfolioId=PB%20SG%2F001",
    );
    expect(buildAdvisoryJourneyHref("PB SG/001", "risk-impact")).toBe(
      "/proposals?portfolioId=PB%20SG%2F001&mode=risk-impact",
    );
    expect(buildAdvisoryJourneyHref("PB SG/001", "proof")).toBe(
      "/recommendations?portfolioId=PB%20SG%2F001&mode=proof",
    );
  });

  it("builds dense shell-visible journey items with one active mode", () => {
    const items = buildAdvisoryJourneyModeItems("PB_1", "approval-queue");

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
        href: "/proposals/simulate?portfolioId=PB_1",
      },
    );
    expect(items.some((item) => item.key === "simulation")).toBe(false);
    expect(items.every((item) => !item.href.includes("#simulation"))).toBe(true);
  });

  it("keeps each journey definition anchored to advisor decisions and source-owned data", () => {
    expect(ADVISORY_JOURNEY_DEFINITIONS).toHaveLength(12);
    for (const definition of ADVISORY_JOURNEY_DEFINITIONS) {
      expect(definition.primaryDecision).toMatch(/\?$/);
      expect(definition.nextAction.length).toBeGreaterThan(10);
      expect(definition.dataSources).toContain("lotus-gateway");
    }
    const discussionPack = getAdvisoryJourneyDefinition("discussion-pack");
    expect(discussionPack.title).toBe("Discussion Pack Review");
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
  });
});
