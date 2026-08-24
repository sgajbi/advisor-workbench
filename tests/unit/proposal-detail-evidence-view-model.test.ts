import { describe, expect, it } from "vitest";

import { buildProposalDetailEvidenceModel } from "../../src/features/proposals/proposal-detail-evidence-view-model";
import type {
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "../../src/features/proposals/types";

describe("buildProposalDetailEvidenceModel", () => {
  it("derives hashes, generated time, stage progress, and bounded workflow history", () => {
    const data: ProposalDetailData = {
      proposal: {
        proposal_id: "PRP-1",
        current_state: "AWAITING_CLIENT_CONSENT",
        current_version_no: 1,
      },
      current_version: {
        artifact_hash: "sha256:artifact",
        evidence_bundle: {
          generated_at: "2026-05-25T01:00:00Z",
          hashes: {
            request_hash: "sha256:request",
            simulation_hash: "sha256:simulation",
          },
        },
      },
    };
    const workflow: ProposalWorkflowEventsData = {
      proposal_id: "PRP-1",
      current_state: "AWAITING_CLIENT_CONSENT",
      events: Array.from({ length: 10 }, (_, index) => ({
        event_id: `event-${index}`,
        event_type: "STATE_CHANGED",
        from_state: index === 0 ? null : "DRAFT",
        to_state: "AWAITING_CLIENT_CONSENT",
        actor_id: "advisor_1",
        occurred_at: "2026-05-25T01:00:00Z",
      })),
    };
    const lineage: ProposalLineageData = {
      proposal_id: "PRP-1",
      versions: [{ version_no: 1, artifact_hash: "sha256:artifact" }],
    };

    const model = buildProposalDetailEvidenceModel({ data, workflow, lineage });

    expect(model.artifactHash).toBe("sha256:artifact");
    expect(model.requestHash).toBe("sha256:request");
    expect(model.simulationHash).toBe("sha256:simulation");
    expect(model.generatedAt).toBe("25 May 2026, 01:00 UTC");
    expect(model.stageItems).toEqual([
      { label: "Draft", reached: true },
      { label: "Review", reached: true },
      { label: "Client Consent", reached: true },
      { label: "Execution Ready", reached: false },
    ]);
    expect(model.visibleWorkflowEvents).toHaveLength(8);
    expect(model.hiddenWorkflowEventCount).toBe(2);
    expect(model.lineageVersions).toHaveLength(1);
  });

  it("returns explicit missing evidence posture when hashes are absent", () => {
    const model = buildProposalDetailEvidenceModel({
      data: {
        proposal: {
          proposal_id: "PRP-2",
          current_state: "DRAFT",
        },
      },
    });

    expect(model.artifactHash).toBeUndefined();
    expect(model.requestHash).toBeUndefined();
    expect(model.simulationHash).toBeUndefined();
    expect(model.generatedAt).toBeUndefined();
    expect(model.hiddenWorkflowEventCount).toBe(0);
    expect(model.lineageVersions).toEqual([]);
  });
});
