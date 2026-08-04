import { describe, expect, it } from "vitest";

import { buildAdvisoryCopilotWorkspaceModel } from "@/features/proposals/advisory-copilot-view-model";

describe("buildAdvisoryCopilotWorkspaceModel AI disclosure", () => {
  it("keeps the untouched workspace unavailable until an action is requested", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({ proposals: [] });

    expect(model.aiDisclosure).toMatchObject({
      preparation: "unavailable",
      availability: "unavailable",
      humanReview: { state: "unavailable", sourceRecorded: false },
      clientUse: "blocked",
    });
    expect(model.aiDisclosure.limitations).toContain(
      "No advisory-assistance output has been requested for this proposal scope.",
    );
    expect(model.aiDisclosure.limitations).not.toContain(
      "No usable generated output is available for review or client use.",
    );
  });

  it("keeps a source-backed AI run review-required and client-use blocked", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      packet: {
        evidence_packet: {
          evidence_packet_id: "packet_1",
          evidence_packet_hash: "packet_hash_1",
          sections: [
            {
              section_key: "PROPOSAL_CONTEXT",
              source_refs: [
                {
                  source_system: "lotus-advise",
                  source_type: "PROPOSAL_VERSION",
                  source_id: "proposal_version_1",
                  access_class: "ADVISOR_USE_SUMMARY",
                },
              ],
            },
          ],
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
      evidence: { state: "supported", sourceCount: 1 },
      humanReview: { state: "review-required", sourceRecorded: false },
      clientUse: "blocked",
    });
  });

  it("does not treat packet and output hashes as underlying source evidence", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      packet: {
        evidence_packet: {
          evidence_packet_id: "packet_2",
          evidence_packet_hash: "packet_hash_2",
          sections: [{ section_key: "PROPOSAL_CONTEXT", source_refs: [] }],
        },
      },
      run: {
        run: {
          evidence_packet_id: "packet_2",
          evidence_packet_hash: "packet_hash_2",
          output_hash: "output_hash_2",
          lotus_ai_workflow_run_id: "ai_run_2",
          output_sections_json: [{ text: "Uncited output." }],
        },
      },
    });

    expect(model.aiDisclosure.evidence).toEqual({ state: "missing", sourceCount: 0 });
    expect(model.aiDisclosure.limitations).toContain(
      "The evidence packet did not publish source references for this output.",
    );
  });

  it("keeps cited output limited when the packet reports unsupported evidence", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      packet: {
        evidence_packet: {
          sections: [
            {
              source_refs: [
                {
                  source_system: "lotus-advise",
                  source_type: "PROPOSAL_VERSION",
                  source_id: "proposal_version_1",
                  access_class: "ADVISOR_USE_SUMMARY",
                },
              ],
            },
          ],
          unsupported_evidence: [
            { advisor_message: "Suitability evidence is not available for this output." },
          ],
        },
      },
      run: {
        run: {
          lotus_ai_workflow_run_id: "ai_run_3",
          output_sections_json: [{ text: "Partially supported output." }],
        },
      },
    });

    expect(model.aiDisclosure.evidence).toEqual({ state: "limited", sourceCount: 1 });
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

  it("uses the singular review endpoint record as the current human-review authority", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      run: {
        run: {
          review_posture: "APPROVED_FOR_INTERNAL_USE",
          client_ready_publication: "BLOCKED",
          lotus_ai_workflow_run_id: "ai_run_4",
          output_sections_json: [{ text: "Reviewed internal output." }],
        },
        review: {
          review_id: "review_4",
          actor_id: "advisor_sg_001",
          occurred_at: "2026-08-04T08:05:00Z",
        },
        replayed: false,
      },
    });

    expect(model.aiDisclosure.humanReview).toEqual({
      state: "reviewed",
      sourceRecorded: true,
      actor: "advisor_sg_001",
      occurredAt: "2026-08-04T08:05:00Z",
    });
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

  it("does not treat metadata-only output sections as usable generated output", () => {
    const model = buildAdvisoryCopilotWorkspaceModel({
      proposals: [],
      run: {
        run: {
          run_id: "run_4",
          lotus_ai_workflow_run_id: "ai_run_4",
          output_sections_json: [{ title: "Advisor summary", text: "   " }],
        },
      },
    });

    expect(model.runSections).toEqual([
      { title: "Advisor summary", text: "No advisor-use output returned." },
    ]);
    expect(model.aiDisclosure).toMatchObject({
      preparation: "requested",
      availability: "unavailable",
    });
  });
});
