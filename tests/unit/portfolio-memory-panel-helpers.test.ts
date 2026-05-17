import { describe, expect, it } from "vitest";

import {
  buildPortfolioMemoryFallbackSnapshotRows,
  buildPortfolioMemoryStatePanelCopy,
  filterPortfolioMemoryEvents,
  portfolioMemoryBadgeTone,
  portfolioMemoryEvidenceAvailability,
  portfolioMemoryReviewPosture,
  resolveSelectedPortfolioMemoryEvent,
  shouldShowPortfolioMemoryStatePanel,
} from "../../src/features/workbench/portfolio-memory-panel-helpers";
import type { PortfolioMemoryEventRow } from "../../src/features/workbench/portfolio-memory-view-model";

const proofEvent: PortfolioMemoryEventRow = {
  key: "memory:proof-pack:ppack_1",
  eventId: "memory:proof-pack:ppack_1",
  displayId: "Memory event 1",
  eventType: "PROOF_PACK_CREATED",
  eventLabel: "Evidence Pack Generated",
  category: "Evidence",
  eventTime: "07 May 2026, 10:00",
  summary: "Pre-trade evidence is available.",
  businessImpact: "Proof Ready",
  actionLabel: "Open",
  status: "READY",
  sourceSystems: "lotus-manage",
  sourceRefs: "lotus-manage:ppack_1",
  artifactRefs: "proof_pack:ppack_1",
  artifactRefCount: 1,
  contentHash: "N/A",
  reasonCodes: "PROOF_READY",
  metadataRows: [],
};

const outcomeEvent: PortfolioMemoryEventRow = {
  ...proofEvent,
  key: "memory:outcome-review:or_1",
  eventId: "memory:outcome-review:or_1",
  displayId: "Memory event 2",
  eventType: "OUTCOME_REVIEW_CREATED",
  eventLabel: "Outcome Review Created",
  category: "Outcome Review",
  artifactRefs: "N/A",
  artifactRefCount: 0,
};

describe("portfolio memory panel helpers", () => {
  it("maps memory supportability states to badge tones", () => {
    expect(portfolioMemoryBadgeTone("READY")).toBe("success");
    expect(portfolioMemoryBadgeTone("COMPLETE")).toBe("success");
    expect(portfolioMemoryBadgeTone("PARTIAL")).toBe("warn");
    expect(portfolioMemoryBadgeTone("UNKNOWN")).toBe("warn");
    expect(portfolioMemoryBadgeTone("BLOCKED")).toBe("danger");
    expect(portfolioMemoryBadgeTone("SOURCE_READY")).toBe("default");
  });

  it("builds state panel copy without reconstructing timeline truth", () => {
    expect(buildPortfolioMemoryStatePanelCopy("empty")).toMatchObject({
      kind: "empty",
      title: "No portfolio memory events returned",
    });
    expect(buildPortfolioMemoryStatePanelCopy("partial")).toMatchObject({
      kind: "partial",
      title: "Portfolio memory is partial",
    });
    expect(buildPortfolioMemoryStatePanelCopy("unsupported")).toMatchObject({
      kind: "unavailable",
      title: "Portfolio memory is not supported",
    });
    expect(buildPortfolioMemoryStatePanelCopy("unavailable")).toMatchObject({
      kind: "partial",
      title: "Portfolio memory is unavailable",
    });
  });

  it("shows state panels for partial, empty, unsupported, unavailable, and error states", () => {
    expect(shouldShowPortfolioMemoryStatePanel("complete", null)).toBe(false);
    expect(shouldShowPortfolioMemoryStatePanel("complete", "Gateway failed")).toBe(true);
    expect(shouldShowPortfolioMemoryStatePanel("empty", null)).toBe(true);
    expect(shouldShowPortfolioMemoryStatePanel("partial", null)).toBe(true);
    expect(shouldShowPortfolioMemoryStatePanel("unsupported", null)).toBe(true);
    expect(shouldShowPortfolioMemoryStatePanel("unavailable", null)).toBe(true);
  });

  it("filters events by source-defined event type and resolves selected fallback", () => {
    const events = [proofEvent, outcomeEvent];
    const filtered = filterPortfolioMemoryEvents(
      events,
      "OUTCOME_REVIEW_CREATED",
    );

    expect(filtered).toEqual([outcomeEvent]);
    expect(filterPortfolioMemoryEvents(events, "ALL")).toEqual(events);
    expect(
      resolveSelectedPortfolioMemoryEvent({
        filteredEvents: filtered,
        selectedEventId: "missing",
        fallbackEvent: proofEvent,
      }),
    ).toBe(outcomeEvent);
    expect(
      resolveSelectedPortfolioMemoryEvent({
        filteredEvents: events,
        selectedEventId: "memory:proof-pack:ppack_1",
        fallbackEvent: outcomeEvent,
      }),
    ).toBe(proofEvent);
    expect(
      resolveSelectedPortfolioMemoryEvent({
        filteredEvents: [],
        selectedEventId: null,
        fallbackEvent: proofEvent,
      }),
    ).toBe(proofEvent);
  });

  it("builds fallback support snapshot rows from selected event display fields", () => {
    expect(buildPortfolioMemoryFallbackSnapshotRows(outcomeEvent)).toEqual([
      { key: "status", label: "Status", value: "Ready" },
      { key: "category", label: "Category", value: "Outcome Review" },
      { key: "evidence", label: "Evidence Items", value: "0" },
    ]);
    expect(buildPortfolioMemoryFallbackSnapshotRows(null)).toEqual([
      { key: "status", label: "Status", value: "Not available" },
      { key: "category", label: "Category", value: "N/A" },
      { key: "evidence", label: "Evidence Items", value: "0" },
    ]);
  });

  it("formats review posture and evidence availability as display labels only", () => {
    expect(portfolioMemoryReviewPosture("READY")).toBe(
      "Ready for advisor review",
    );
    expect(portfolioMemoryReviewPosture("BLOCKED")).toBe(
      "Needs advisor attention",
    );
    expect(portfolioMemoryReviewPosture("UNAVAILABLE")).toBe("Unavailable");
    expect(portfolioMemoryEvidenceAvailability("proof_pack:ppack_1")).toBe(
      "Available",
    );
    expect(portfolioMemoryEvidenceAvailability("N/A")).toBe("Not available");
  });
});
