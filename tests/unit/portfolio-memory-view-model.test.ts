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
    expect(model.latestEventTime).toBe("07 May 2026, 10:00 UTC");
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
      eventTime: "07 May 2026, 10:00 UTC",
    });
    expect(model.selectedEvent?.eventId).toBe("memory:proof-pack:ppack_1");
    expect(model.latestMemoryEvent).toBe("Evidence Pack Generated");
    expect(model.memoryCoverage).toBe("Complete");
    expect(model.openFollowUps).toBe("0 Items");
    expect(model.evidenceLinks).toBe("2 Available");
    expect(model.recommendedActions.map((action) => action.title)).toEqual([
      "Review latest memory event",
      "Open linked evidence pack",
      "Review supportability posture",
    ]);
    expect(JSON.stringify(model.recommendedActions)).not.toContain("Add advisor note");
    expect(JSON.stringify(model.recommendedActions)).not.toContain("client preference");
  });

  it("fails closed when source audit instants are malformed or omit timezone evidence", () => {
    const [sourceEvent] = (memoryResponse.data as {
      events: Array<Record<string, unknown>>;
    }).events;
    const model = buildPortfolioMemoryPanelModel({
      ...memoryResponse,
      data: {
        ...memoryResponse.data,
        summary: { latest_event_at: "not-a-timestamp" },
        events: [
          {
            ...sourceEvent,
            event_time: "2026-05-07T10:00:00",
          },
        ],
      },
    });

    expect(model.latestEventTime).toBe("Not reported");
    expect(model.events[0]?.eventTime).toBe("Not reported");
    expect(JSON.stringify(model)).not.toContain("not-a-timestamp");
    expect(JSON.stringify(model)).not.toContain("2026-05-07T10:00:00");
  });

  it("preserves bounded source-family search facets without changing timeline authority", () => {
    const model = buildPortfolioMemoryPanelModel(memoryResponse, {
      ...memoryResponse,
      supportability: {
        ...memoryResponse.supportability,
        event_count: 2,
        event_type_counts: { OUTCOME_REVIEW_SOURCE_LINEAGE_RECORDED: 2 },
        source_systems: ["lotus-performance"],
        source_system_counts: { "lotus-performance": 2 },
        source_type_counts: {
          "PortfolioRealizedTaxSummary:v1": 1,
          "PortfolioCashMovementSummary:v1": 1,
        },
        reason_codes: ["PERSISTED_LINEAGE_SEARCH_ONLY"],
        content_hash: "sha256:memory-search",
      },
      data: {
        support_boundary: {
          manage_persisted_lineage_only: true,
          source_owner_store_query: false,
          global_portfolio_discovery: false,
        },
        items: [
          {
            event_id: "memory:tax:PMTAX_001",
            source_id: "PMTAX_001",
          },
        ],
      },
    });

    expect(model.events.map((row) => row.eventId)).toEqual([
      "memory:proof-pack:ppack_1",
      "memory:outcome-review:or_1",
    ]);
    expect(model.sourceFacetRows).toEqual([
      {
        key: "system-lotus-performance",
        label: "lotus-performance",
        count: "2",
        family: "system",
      },
      {
        key: "type-PortfolioRealizedTaxSummary:v1",
        label: "PortfolioRealizedTaxSummary:v1",
        count: "1",
        family: "type",
      },
      {
        key: "type-PortfolioCashMovementSummary:v1",
        label: "PortfolioCashMovementSummary:v1",
        count: "1",
        family: "type",
      },
    ]);
    expect(model.sourceBoundaryRows).toContain("Source Owner Store Query: No");
    expect(JSON.stringify(model)).not.toContain("PMTAX_001");
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

  it("labels campaign assignment task transitions with bounded safe workflow detail", () => {
    const model = buildPortfolioMemoryPanelModel({
      ...memoryResponse,
      supportability: {
        ...memoryResponse.supportability,
        event_count: 1,
        event_type_counts: {
          BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION: 1,
        },
      },
      data: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        events: [
          {
            event_id: "memory:campaign-assignment-task-transition:transition_001",
            event_type: "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION",
            event_time: "2026-05-21T08:15:00Z",
            title: "raw transition rationale should not render",
            summary: "raw reviewer note should not render",
            status: "IN_PROGRESS",
            supportability_state: "PENDING_REVIEW",
            source_refs: [
              {
                source_system: "lotus-manage",
                source_type: "BulkReviewCampaignDefinition",
                source_id: "campaign_001:v1",
              },
            ],
            artifact_refs: [
              {
                source_system: "lotus-manage",
                source_type: "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK",
                source_id: "task_001",
              },
            ],
            content_hash: "sha256:assignment-task-transition",
            reason_codes: [
              "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_RECORDED",
            ],
            metadata: {
              task_ref: "task-ref-001",
              assignment_task_id: "task_001",
              transition_type: "ACKNOWLEDGE",
              from_status: "OPEN",
              to_status: "IN_PROGRESS",
              sla_posture: "ON_TRACK",
              supportability_state: "PENDING_REVIEW",
              transition_reason: "unsafe transition rationale",
              raw_rationale: "unsafe raw rationale",
              reviewer_notes: "unsafe reviewer note",
              generated_ai_text: "unsafe AI text",
              client_contact: "message client",
              oms_action: "route order",
              order_instruction: "buy security",
            },
          },
        ],
      },
    });

    expect(model.eventTypeRows[0]).toMatchObject({
      eventType: "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION",
      eventLabel: "Campaign Assignment Task Transition",
    });
    expect(model.events[0]).toEqual(
      expect.objectContaining({
        eventLabel: "Campaign Assignment Task Transition",
        category: "Campaign Workflow",
        summary:
          "A campaign assignment task transition was recorded from Manage workflow evidence.",
        businessImpact: "Bulk Review Campaign Assignment Task Transition Recorded",
        actionLabel: "View",
        status: "PENDING_REVIEW",
        contentHash: "sha256:assignment-task-transition",
      }),
    );
    expect(model.events[0].metadataRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Task Ref", value: "task-ref-001" }),
        expect.objectContaining({ label: "Transition", value: "ACKNOWLEDGE" }),
        expect.objectContaining({ label: "From Status", value: "OPEN" }),
        expect.objectContaining({ label: "To Status", value: "IN_PROGRESS" }),
        expect.objectContaining({ label: "SLA Posture", value: "ON_TRACK" }),
        expect.objectContaining({ label: "Content Hash", value: "sha256:assignment-task-transition" }),
      ]),
    );
    expect(JSON.stringify(model.events[0])).not.toContain("unsafe transition rationale");
    expect(JSON.stringify(model.events[0])).not.toContain("unsafe raw rationale");
    expect(JSON.stringify(model.events[0])).not.toContain("unsafe reviewer note");
    expect(JSON.stringify(model.events[0])).not.toContain("unsafe AI text");
    expect(JSON.stringify(model.events[0])).not.toContain("message client");
    expect(JSON.stringify(model.events[0])).not.toContain("route order");
    expect(JSON.stringify(model.events[0])).not.toContain("buy security");
  });
});
