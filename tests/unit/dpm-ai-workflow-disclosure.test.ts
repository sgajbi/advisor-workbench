import { describe, expect, it } from "vitest";

import {
  buildDpmAiInvocationEvidenceOutcome,
  buildDpmAiWorkflowOutcome as buildSourceBoundDpmAiWorkflowOutcome,
} from "@/features/workbench/dpm-ai-workflow-disclosure";
import type { DpmAiWorkflowFamily } from "@/features/workbench/dpm-ai-workflow-profiles";
import { DPM_AI_WORKFLOW_PROFILES } from "@/features/workbench/dpm-ai-workflow-profiles";
import {
  buildDpmAiWorkflowResponse,
  getDpmAiWorkflowFixtureSourceReference,
} from "../fixtures/dpm-ai-workflow-fixtures";

function buildDpmAiWorkflowOutcome(
  family: DpmAiWorkflowFamily,
  response: unknown,
  expectedSourceReference = getDpmAiWorkflowFixtureSourceReference(family),
) {
  return buildSourceBoundDpmAiWorkflowOutcome(
    family,
    response,
    expectedSourceReference,
  );
}

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

  it.each(Object.keys(DPM_AI_WORKFLOW_PROFILES))(
    "fails closed when the %s response belongs to another source object",
    (family) => {
      const typedFamily = family as DpmAiWorkflowFamily;
      const outcome = buildDpmAiWorkflowOutcome(
        typedFamily,
        buildDpmAiWorkflowResponse(typedFamily, {
          sourceReference: "different-source-object",
        }),
      );

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        evidence: { state: "limited" },
        clientUse: "blocked",
      });
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
        preparation: "deterministic",
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

  it("blocks source-approved client use when runtime redaction is inactive", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        outputLabel: "CLIENT_USE_APPROVED",
        reviewState: "ACCEPTED",
        runtimeRedactionActive: false,
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "ai-assisted",
      availability: "live",
      humanReview: { state: "reviewed", sourceRecorded: true },
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "Runtime redaction was not reported as active; keep the result within its governed internal scope.",
    );
  });

  it("fails closed for an unknown output-use label", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        outputLabel: "PUBLIC_OK",
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.businessSummary).toContain("incomplete");
  });

  it.each([
    ["blank text", { memo: "   " }],
    ["null value", { summary: null }],
    ["empty collection", { observations: [] }],
    ["empty object", { decisionSupport: {} }],
    ["nested empty values", { decisionSupport: { memo: "", observations: [null] } }],
  ])("fails closed for schema-shaped output containing %s", (_name, structuredOutput) => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", { structuredOutput }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "requested",
      availability: "unavailable",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "No usable generated output was returned.",
    );
  });

  it("keeps zero and false values when the structured result explicitly publishes them", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: { exceptionCount: 0, escalationRequired: false },
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "ai-assisted",
      availability: "live",
      evidence: { state: "supported" },
      clientUse: "internal-only",
    });
  });

  it.each([
    {
      name: "unbound caller",
      response: buildDpmAiWorkflowResponse("proof-pack-memo", {
        supportabilityStatus: "HISTORICAL",
        supersededByRunId: "packrun_replacement_002",
        callerIdentityBound: false,
      }),
    },
    {
      name: "different workflow family",
      response: buildDpmAiWorkflowResponse("wave-memo", {
        supportabilityStatus: "HISTORICAL",
        supersededByRunId: "packrun_replacement_002",
      }),
    },
  ])("does not classify historical output with $name as trusted", ({ response }) => {
    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.businessSummary).toContain("incomplete");
  });

  it.each([
    {
      name: "denied eligibility decision",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.eligibility.eligibility_result = "DENIED";
      },
    },
    {
      name: "denied authorization decision",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.authorization.outcome = "DENIED";
      },
    },
    {
      name: "missing authenticated caller",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.authorization.authenticated_caller_app = null;
      },
    },
    {
      name: "different authenticated caller",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.authorization.authenticated_caller_app = "untrusted-app";
      },
    },
  ])("fails closed for contradictory authority with $name", ({ mutate }) => {
    const response = buildDpmAiWorkflowResponse("proof-pack-memo");
    mutate(response);

    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "The source did not publish a bound authorization decision.",
    );
  });

  it.each([
    {
      name: "workflow-pack version",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.eligibility.requested_version = "";
        response.data.workflow_pack_run.pack_version = "";
      },
    },
    {
      name: "registration reference",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.eligibility.evaluated_registration_ref = null;
        response.data.workflow_pack_run.registration_ref = "";
      },
    },
    {
      name: "caller application",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.eligibility.caller_app = "";
        response.data.workflow_pack_run.caller_app = "";
        response.data.execution.audit.authorization.caller_app = "";
        response.data.execution.audit.authorization.authenticated_caller_app = null;
      },
    },
  ])("fails closed when both $name identity fields are missing", ({ mutate }) => {
    const response = buildDpmAiWorkflowResponse("proof-pack-memo");
    mutate(response);

    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
  });

  it("classifies source-completed superseded output as historical", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        runtimeState: "SUPERSEDED",
        replacementRunId: "packrun_replacement_002",
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "ai-assisted",
      availability: "stale",
      freshness: { state: "stale" },
      clientUse: "blocked",
    });
    expect(outcome.businessSummary).toContain("historical");
    expect(outcome.disclosure.diagnostics).toContainEqual({
      label: "Replacement run",
      value: "packrun_replacement_002",
    });
  });

  it.each(["REJECTED", "ABANDONED"] as const)(
    "blocks and clearly describes %s decision support",
    (reviewState) => {
      const outcome = buildDpmAiWorkflowOutcome(
        "proof-pack-memo",
        buildDpmAiWorkflowResponse("proof-pack-memo", { reviewState }),
      );

      expect(outcome.disclosure).toMatchObject({
        humanReview: { state: "rejected", sourceRecorded: true },
        clientUse: "blocked",
      });
      expect(outcome.businessSummary).toContain("was rejected");
      expect(outcome.businessSummary).toContain("must not be used");
    },
  );

  it.each(["REJECTED", "ABANDONED"] as const)(
    "keeps rejected %s simulations explicitly unusable",
    (reviewState) => {
      const outcome = buildDpmAiWorkflowOutcome(
        "proof-pack-memo",
        buildDpmAiWorkflowResponse("proof-pack-memo", {
          reviewState,
          stubbed: true,
        }),
      );

      expect(outcome.disclosure).toMatchObject({
        availability: "simulation",
        humanReview: { state: "rejected" },
        clientUse: "blocked",
      });
      expect(outcome.businessSummary).toContain("was rejected");
      expect(outcome.businessSummary).toContain("must not be used");
      expect(outcome.businessSummary).not.toContain("internal evaluation");
    },
  );

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

  it("keeps persisted invocation evidence separate from generated output", () => {
    const outcome = buildDpmAiInvocationEvidenceOutcome({
      invocationId: "pmq_summary_001",
      invocationState: "PENDING_REVIEW",
      workflowRunId: "wf_pmq_summary_001",
      artifactRef: "artifact://pmq-summary/001",
      contentHash: "sha256:summary-invocation",
      sourceRefs: "lotus-manage:pmq_summary_001",
      reviewActionId: "pmq_review_001",
    });

    expect(outcome.disclosure).toMatchObject({
      preparation: "requested",
      availability: "unavailable",
      evidence: { state: "limited", sourceCount: 3 },
      humanReview: { state: "unavailable", sourceRecorded: false },
      clientUse: "blocked",
    });
    expect(outcome.businessSummary).toContain("recorded for audit");
    expect(outcome.disclosure.diagnostics).toContainEqual({
      label: "Summary invocation",
      value: "pmq_summary_001",
    });
  });
});
