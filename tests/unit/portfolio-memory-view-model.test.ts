import { describe, expect, it } from "vitest";

import { buildPortfolioMemoryPanelModel } from "../../src/features/workbench/portfolio-memory-view-model";
import type { DpmPortfolioMemoryGatewayResponse } from "../../src/features/workbench/types";

const memoryResponse: DpmPortfolioMemoryGatewayResponse = {
  correlation_id: "corr-memory",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
    state: "READY",
    event_count: 2,
    event_type_counts: {
      PROOF_PACK_CREATED: 1,
      OUTCOME_REVIEW_CREATED: 1,
    },
    source_systems: ["lotus-manage", "lotus-core"],
    reason_codes: ["SOURCE_READY"],
    content_hash: "sha256:portfolio-memory",
  },
  data: {
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    events: [
      {
        event_id: "memory:proof-pack:ppack_1",
        event_type: "PROOF_PACK_CREATED",
        event_time: "2026-05-07T10:00:00Z",
        source_refs: [{ source_system: "lotus-manage", source_id: "ppack_1" }],
        artifact_refs: [{ artifact_type: "proof_pack", artifact_id: "ppack_1" }],
        reason_codes: ["PROOF_READY"],
      },
      {
        event_id: "memory:outcome-review:or_1",
        event_type: "OUTCOME_REVIEW_CREATED",
        event_time: "2026-05-07T10:05:00Z",
        source_refs: [{ source_system: "lotus-manage", source_id: "or_1" }],
        artifact_refs: [{ artifact_type: "outcome_review", artifact_id: "or_1" }],
        reason_codes: ["OUTCOME_REVIEW_READY"],
      },
    ],
  },
};

describe("portfolio-memory view model", () => {
  it("preserves manage event order, supportability, refs, and content hash", () => {
    const model = buildPortfolioMemoryPanelModel(memoryResponse);

    expect(model.state).toBe("complete");
    expect(model.supportabilityState).toBe("READY");
    expect(model.portfolioId).toBe("PB_SG_GLOBAL_BAL_001");
    expect(model.eventCount).toBe("2");
    expect(model.latestEventTime).toBe("07 May 2026, 10:00");
    expect(model.artifactRefCount).toBe("2");
    expect(model.contentHash).toBe("sha256:portfolio-memory");
    expect(model.eventTypeRows.map((row) => row.eventType)).toEqual([
      "PROOF_PACK_CREATED",
      "OUTCOME_REVIEW_CREATED",
    ]);
    expect(model.events.map((row) => row.eventId)).toEqual([
      "memory:proof-pack:ppack_1",
      "memory:outcome-review:or_1",
    ]);
    expect(model.events[0]).toMatchObject({
      displayId: "Memory event 1",
      eventLabel: "Evidence Pack Generated",
      category: "Evidence",
      summary: "Pre-trade evidence is available for advisor review.",
      businessImpact: "Proof Ready",
      actionLabel: "Open",
      status: "READY",
      sourceRefs: "lotus-manage:ppack_1",
      artifactRefs: "proof_pack:ppack_1",
      artifactRefCount: 1,
      contentHash: "N/A",
      reasonCodes: "PROOF_READY",
    });
    expect(model.selectedEvent?.eventId).toBe("memory:proof-pack:ppack_1");
    expect(model.latestMemoryEvent).toBe("Evidence Pack Generated");
    expect(model.memoryCoverage).toBe("Complete");
    expect(model.openFollowUps).toBe("0 Items");
    expect(model.evidenceLinks).toBe("2 Available");
  });

  it("does not infer readiness from populated events when manage supportability is partial", () => {
    const model = buildPortfolioMemoryPanelModel({
      ...memoryResponse,
      supportability: {
        ...memoryResponse.supportability,
        state: "PARTIAL",
        reason_codes: ["SOURCE_PARTIAL"],
      },
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("PARTIAL");
    expect(model.events).toHaveLength(2);
  });

  it("treats blocked portfolio-memory supportability as action-required timeline truth", () => {
    const model = buildPortfolioMemoryPanelModel({
      ...memoryResponse,
      supportability: {
        ...memoryResponse.supportability,
        state: "BLOCKED",
        reason_codes: ["DPM_OPERATIONS_REVIEW_REQUIRED"],
      },
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("BLOCKED");
    expect(model.reasonCodes).toEqual(["DPM_OPERATIONS_REVIEW_REQUIRED"]);
  });

  it("labels PM quality review actions as bounded supervisory records without raw rationale leakage", () => {
    const model = buildPortfolioMemoryPanelModel({
      ...memoryResponse,
      supportability: {
        ...memoryResponse.supportability,
        event_count: 1,
        event_type_counts: { PM_QUALITY_REVIEW_ACTION: 1 },
      },
      data: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        events: [
          {
            event_id: "memory:pm-quality-review-action:pmq_review_001",
            event_type: "PM_QUALITY_REVIEW_ACTION",
            event_time: "2026-05-13T10:05:00Z",
            title: "raw rationale should not render",
            summary: "raw score 90 and PM ranking should not render",
            metadata: {
              review_rationale: "raw rationale from manage",
              score: "90.00",
              pm_ranking: "1",
              content_hash: "sha256:pmq-review",
              client_contact: "message client",
              oms_action: "route order",
            },
            reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
          },
        ],
      },
    });

    expect(model.events[0]).toEqual(
      expect.objectContaining({
        eventLabel: "PM Quality Supervisory Review Action",
        category: "Operating Quality",
        summary: "A bounded PM operating quality supervisory review action is available.",
        businessImpact: "Pm Quality Review Action Ready",
      })
    );
    expect(JSON.stringify(model.events[0])).not.toContain("raw rationale");
    expect(JSON.stringify(model.events[0])).not.toContain("90.00");
    expect(JSON.stringify(model.events[0])).not.toContain("pm_ranking");
    expect(JSON.stringify(model.events[0])).not.toContain("sha256:pmq-review");
    expect(JSON.stringify(model.events[0])).not.toContain("message client");
    expect(JSON.stringify(model.events[0])).not.toContain("route order");
  });
});
