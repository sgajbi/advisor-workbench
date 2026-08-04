import { describe, expect, it } from "vitest";

import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import { DPM_AI_WORKFLOW_PROFILES } from "@/features/workbench/dpm-ai-workflow-profiles";
import { buildDpmAiWorkflowResponse } from "../fixtures/dpm-ai-workflow-fixtures";

describe("buildDpmAiWorkflowOutcome", () => {
  it.each(Object.keys(DPM_AI_WORKFLOW_PROFILES))(
    "maps the %s action through its exact source contract",
    (family) => {
      const typedFamily = family as keyof typeof DPM_AI_WORKFLOW_PROFILES;
      const outcome = buildDpmAiWorkflowOutcome(
        typedFamily,
        buildDpmAiWorkflowResponse(typedFamily),
      );

      expect(outcome).toMatchObject({
        family: typedFamily,
        scopeLabel: DPM_AI_WORKFLOW_PROFILES[typedFamily].scopeLabel,
        disclosure: {
          preparation: "ai-assisted",
          availability: "live",
          evidence: { state: "supported", sourceCount: 1 },
          humanReview: { state: "review-required", sourceRecorded: false },
          clientUse: "internal-only",
          freshness: { state: "not-reported" },
        },
      });
      expect(outcome.businessSummary).toContain(
        "available for internal review",
      );
    },
  );

  it.each([
    {
      name: "request still running",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        runtimeState: "RUNNING",
        structuredOutput: {},
      }),
      expected: {
        preparation: "requested",
        availability: "unavailable",
        clientUse: "blocked",
      },
    },
    {
      name: "deterministic simulation",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        stubbed: true,
      }),
      expected: {
        preparation: "ai-assisted",
        availability: "simulation",
        clientUse: "internal-only",
      },
    },
    {
      name: "historical replacement",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        supportabilityStatus: "HISTORICAL",
        supersededByRunId: "packrun_replacement_002",
      }),
      expected: {
        availability: "stale",
        clientUse: "blocked",
        freshness: { state: "stale" },
      },
    },
    {
      name: "missing evidence",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        evidenceDescriptors: [],
      }),
      expected: { evidence: { state: "missing", sourceCount: 0 } },
    },
    {
      name: "unbound caller",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        callerIdentityBound: false,
      }),
      expected: { preparation: "unavailable", availability: "partial" },
    },
  ])("fails closed for $name", ({ response, expected }) => {
    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject(expected);
  });

  it("requires a source-recorded actor and time before showing reviewed posture", () => {
    const response = buildDpmAiWorkflowResponse("outcome-narrative", {
      reviewState: "ACCEPTED",
    });
    response.data.workflow_pack_run.review_summary = {
      latest_review_event_at: null,
      latest_review_actor: null,
      review_transition_count: 1,
      has_review_history: true,
    };

    const outcome = buildDpmAiWorkflowOutcome("outcome-narrative", response);

    expect(outcome.disclosure.humanReview).toEqual({
      state: "unavailable",
      sourceRecorded: false,
    });
  });

  it("downgrades a response published for another workflow family", () => {
    const response = buildDpmAiWorkflowResponse("wave-memo");

    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "The returned workflow contract or authority evidence was incomplete or inconsistent.",
    );
  });
});
