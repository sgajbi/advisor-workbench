import { describe, expect, it } from "vitest";

import { buildAdvisoryCopilotWorkspaceModel } from "@/features/proposals/advisory-copilot-view-model";

describe("buildAdvisoryCopilotWorkspaceModel AI disclosure", () => {
  it("keeps a source-backed AI run review-required and client-use blocked", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      packet: {
        evidence_packet: {
          evidence_packet_id: "packet_1",
          evidence_packet_hash: "packet_hash_1",
          sections: [],
        },
      },
      run: {
        run: {
          run_id: "run_1",
          evidence_packet_id: "packet_1",
          evidence_packet_hash: "packet_hash_1",
          output_hash: "output_hash_1",
          lotus_ai_workflow_run_id: "ai_run_1",
          review_posture: "REVIEW_REQUIRED",
          client_ready_publication: "BLOCKED",
          created_at: "2026-08-04T08:00:00Z",
          output_sections_json: [{ title: "Advisor summary", text: "Review required." }],
        },
      },
    });

    expect(model.aiDisclosure).toMatchObject({
      preparation: "ai-assisted",
      availability: "live",
      evidence: { state: "supported", sourceCount: 3 },
      humanReview: { state: "review-required", sourceRecorded: false },
      clientUse: "blocked",
    });
  });

  it("requires a source review record before showing internal review as recorded", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      run: {
        run: {
          run_id: "run_2",
          review_posture: "APPROVED_FOR_INTERNAL_USE",
          client_ready_publication: "BLOCKED",
          lotus_ai_workflow_run_id: "ai_run_2",
          output_sections_json: [{ text: "Internal working output." }],
        },
      },
    });

    expect(model.aiDisclosure.humanReview).toEqual({
      state: "unavailable",
      sourceRecorded: false,
    });
    expect(model.aiDisclosure.limitations).toContain(
      "The source did not publish reviewer identity and review time with this response.",
    );
  });

  it("fails closed when output is returned without AI workflow provenance", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      run: {
        run: {
          run_id: "run_3",
          review_posture: "REVIEW_REQUIRED",
          client_ready_publication: "BLOCKED",
          output_sections_json: [{ text: "Unclassified output." }],
        },
      },
    });

    expect(model.aiDisclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "missing", sourceCount: 0 },
      humanReview: { state: "review-required" },
      clientUse: "blocked",
    });
  });
});
