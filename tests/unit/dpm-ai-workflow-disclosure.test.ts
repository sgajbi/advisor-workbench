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
  it.each(Object.entries(DPM_AI_WORKFLOW_PROFILES))(
    "adopts every default output requested by the %s workflow",
    (_family, profile) => {
      const adoptedKeys = new Set(profile.materialFields.map(({ key }) => key));

      expect(profile.requestedOutputs).not.toHaveLength(0);
      expect(profile.requestedOutputs.filter((key) => !adoptedKeys.has(key))).toEqual([]);
    },
  );

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
        material: {
          title: DPM_AI_WORKFLOW_PROFILES[typedFamily].materialTitle,
          sections: expect.arrayContaining([
            { label: "Review posture", values: ["Review required"] },
            { label: "Permitted scope", values: ["Support only"] },
          ]),
        },
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
    "fails closed when the %s source supportability is blocked",
    (family) => {
      const typedFamily = family as DpmAiWorkflowFamily;
      const outcome = buildDpmAiWorkflowOutcome(
        typedFamily,
        buildDpmAiWorkflowResponse(typedFamily, {
          sourceSupportabilityState: "BLOCKED",
        }),
      );

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        evidence: { state: "limited" },
        clientUse: "blocked",
      });
      expect(outcome.material.sections).toEqual([]);
      expect(outcome.disclosure.limitations).toContain(
        "The supporting source did not publish a ready, authoritative posture for this assistance result.",
      );
    },
  );

  it.each([null, "UNSUPPORTED", "PARTIAL", "DEGRADED", "UNKNOWN", "EMPTY", "DISABLED"])(
    "fails closed for source supportability state %s",
    (state) => {
      const response = buildDpmAiWorkflowResponse("proof-pack-memo");
      Object.assign(response.supportability, { state });

      const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        clientUse: "blocked",
      });
      expect(outcome.material.sections).toEqual([]);
    },
  );

  it.each([
    ["missing source service", { source_service: null }],
    ["different source service", { source_service: "lotus-idea" }],
    ["missing authority", { authority: null }],
    ["different authority", { authority: "lotus-manage:RFC-0099" }],
  ])("fails closed for source supportability with %s", (_name, mutation) => {
    const response = buildDpmAiWorkflowResponse("proof-pack-memo");
    Object.assign(response.supportability, mutation);

    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
  });

  it.each([
    {
      family: "proof-pack-memo" as const,
      output: { pm_memo: "Review allocation drift before approval." },
      label: "Portfolio manager memo",
      value: "Review allocation drift before approval.",
    },
    {
      family: "wave-memo" as const,
      output: { memo_sections: ["Allocation drift", "Tax impact"] },
      label: "Memo sections",
      value: "Tax impact",
    },
    {
      family: "operations-handoff" as const,
      output: { sections: ["Validate settlement instructions"] },
      label: "Handoff sections",
      value: "Validate settlement instructions",
    },
    {
      family: "exception-summary" as const,
      output: { recommended_triage: ["Repair source data"] },
      label: "Recommended triage",
      value: "Repair source data",
    },
    {
      family: "outcome-narrative" as const,
      output: { pm_summary: "Outcome remains within mandate." },
      label: "Portfolio manager summary",
      value: "Outcome remains within mandate.",
    },
    {
      family: "pm-quality-summary" as const,
      output: { score_run_summary: "Quality controls require review." },
      label: "Quality summary",
      value: "Quality controls require review.",
    },
  ])("normalizes readable $family business material", ({ family, output, label, value }) => {
    const outcome = buildDpmAiWorkflowOutcome(
      family,
      buildDpmAiWorkflowResponse(family, { structuredOutput: output }),
    );

    expect(outcome.material.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label,
          values: expect.arrayContaining([value]),
        }),
      ]),
    );
  });

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

  it.each(["RUNNING", "FAILED"] as const)(
    "does not publish material from a %s workflow run",
    (runtimeState) => {
      const outcome = buildDpmAiWorkflowOutcome(
        "proof-pack-memo",
        buildDpmAiWorkflowResponse("proof-pack-memo", { runtimeState }),
      );

      expect(outcome.disclosure.availability).toBe("unavailable");
      expect(outcome.material.sections).toEqual([]);
    },
  );

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
      preparation: "unavailable",
      availability: "partial",
      humanReview: { state: "reviewed", sourceRecorded: true },
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "Runtime redaction was not reported as active; keep the result within its governed internal scope.",
    );
  });

  it.each([
    {
      name: "missing safety mode",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        Object.assign(response.data.execution.audit.safety, { safety_mode: null });
      },
    },
    {
      name: "documented-only safety mode",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.safety_mode = "documented_only";
      },
    },
    {
      name: "disabled safety mode",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.safety_mode = "disabled";
      },
    },
    {
      name: "documented-only disposition",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.disposition = "DOCUMENTED_ONLY";
      },
    },
    {
      name: "blocked disposition",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.disposition = "BLOCKED";
      },
    },
    {
      name: "degraded disposition",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.disposition = "DEGRADED";
      },
    },
    {
      name: "missing response labeling control",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.enforced_controls = [
          "correlation_and_audit",
          "runtime_redaction_engine",
        ];
      },
    },
    {
      name: "missing correlation and audit control",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.enforced_controls = [
          "response_labeling",
          "runtime_redaction_engine",
        ];
      },
    },
    {
      name: "missing runtime redaction control",
      mutate: (response: ReturnType<typeof buildDpmAiWorkflowResponse>) => {
        response.data.execution.audit.safety.enforced_controls = [
          "response_labeling",
          "correlation_and_audit",
        ];
      },
    },
  ])("fails closed for $name", ({ mutate }) => {
    const response = buildDpmAiWorkflowResponse("proof-pack-memo", {
      outputLabel: "CLIENT_USE_APPROVED",
      reviewState: "ACCEPTED",
    });
    mutate(response);

    const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
    expect(outcome.disclosure.limitations).toContain(
      "Required safety controls were not reported as enforced for this assistance result.",
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

  it("fails closed when workflow-surface eligibility was not applied", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        workflowSurfaceApplied: false,
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
  });

  it.each([null, "lotus-idea"])(
    "fails closed for workflow authority owner %s",
    (owner) => {
      const response = buildDpmAiWorkflowResponse("proof-pack-memo");
      response.data.workflow_pack_run.workflow_authority_owner = owner as string;

      const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        evidence: { state: "limited" },
        clientUse: "blocked",
      });
      expect(outcome.material.sections).toEqual([]);
    },
  );

  it.each([null, "portfolio_read"])(
    "fails closed for authorization capability %s",
    (capability) => {
      const response = buildDpmAiWorkflowResponse("proof-pack-memo");
      Object.assign(response.data.execution.audit.authorization, {
        capability_type: capability,
      });

      const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        evidence: { state: "limited" },
        clientUse: "blocked",
      });
      expect(outcome.material.sections).toEqual([]);
    },
  );

  it.each([
    ["missing eligibility identity class", { callerIdentityClass: "" }],
    ["different eligibility identity class", { callerIdentityClass: "BANKER_PRODUCT" }],
    ["missing authorization identity source", { callerIdentitySource: "" }],
    ["different authorization identity source", { callerIdentitySource: "request_body" }],
  ])("fails closed for %s", (_name, options) => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", options),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
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

  it("fails closed when output has no supported business-material field", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: {
          unmapped_generated_text: "This cannot be presented without an adopted business meaning.",
        },
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
  });

  it("groups adopted aliases under one business label", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: {
          pm_memo: "Primary portfolio-manager view.",
          memo: "Supporting portfolio-manager context.",
        },
      }),
    );

    expect(outcome.material.sections).toEqual([
      {
        label: "Portfolio manager memo",
        values: [
          "Primary portfolio-manager view.",
          "Supporting portfolio-manager context.",
        ],
      },
    ]);
  });

  it("fails closed for deeply nested material arrays without unbounded recursion", () => {
    let nestedMaterial: unknown = "Do not reach this value.";
    for (let depth = 0; depth < 10_000; depth += 1) {
      nestedMaterial = [nestedMaterial];
    }

    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: { memo_sections: nestedMaterial },
      }),
    );

    expect(outcome.disclosure.availability).toBe("unavailable");
    expect(outcome.material.sections).toEqual([]);
  });

  it("fails closed when a material field exceeds its container item budget", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: {
          memo_sections: Array.from({ length: 21 }, (_, index) => `Section ${index + 1}`),
        },
      }),
    );

    expect(outcome.disclosure.availability).toBe("unavailable");
    expect(outcome.material.sections).toEqual([]);
  });

  it("fails closed when an over-budget section accompanies smaller presentable material", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: {
          pm_memo: Array.from({ length: 3 }, (_, group) =>
            Array.from(
              { length: 20 },
              (_, item) => `Memo point ${group * 20 + item + 1}`,
            ),
          ),
          state: "REVIEW_REQUIRED",
        },
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "limited" },
      clientUse: "blocked",
    });
    expect(outcome.material.sections).toEqual([]);
  });

  it("preserves opaque supporting references exactly", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "operations-handoff",
      buildDpmAiWorkflowResponse("operations-handoff", {
        structuredOutput: {
          support_references: ["proof_pack_ABC_001", "artifact-XYZ-009"],
        },
      }),
    );

    expect(outcome.material.sections).toEqual([
      {
        label: "Supporting references",
        values: ["proof_pack_ABC_001", "artifact-XYZ-009"],
      },
    ]);
  });

  it("keeps zero and false values when the structured result explicitly publishes them", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "proof-pack-memo",
      buildDpmAiWorkflowResponse("proof-pack-memo", {
        structuredOutput: {
          evidence_gap_count: 0,
          escalation_required: false,
        },
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      preparation: "ai-assisted",
      availability: "live",
      evidence: { state: "supported" },
      clientUse: "internal-only",
    });
    expect(outcome.material.sections).toEqual(
      expect.arrayContaining([
        { label: "Evidence gaps", values: ["0"] },
        { label: "Escalation required", values: ["No"] },
      ]),
    );
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

  it.each([null, "lotus-idea"])(
    "fails closed for eligibility service identity %s",
    (service) => {
      const response = buildDpmAiWorkflowResponse("proof-pack-memo");
      Object.assign(response.data.eligibility, { service });

      const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

      expect(outcome.disclosure).toMatchObject({
        preparation: "unavailable",
        availability: "partial",
        evidence: { state: "limited" },
        clientUse: "blocked",
      });
      expect(outcome.material.sections).toEqual([]);
    },
  );

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
    "keeps %s blocked but marks its missing review record unverified",
    (reviewState) => {
      const response = buildDpmAiWorkflowResponse("proof-pack-memo", {
        reviewState,
      });
      response.data.workflow_pack_run.review_summary = {
        latest_review_event_at: null,
        latest_review_actor: null,
        review_transition_count: 1,
        has_review_history: true,
      };

      const outcome = buildDpmAiWorkflowOutcome("proof-pack-memo", response);

      expect(outcome.disclosure).toMatchObject({
        humanReview: { state: "rejected", sourceRecorded: false },
        clientUse: "blocked",
      });
      expect(outcome.disclosure.limitations).toContain(
        "The source did not publish the review record supporting its review state.",
      );
      expect(outcome.businessSummary).toContain("unverified rejection state");
      expect(outcome.businessSummary).toContain("must not be used");
      expect(outcome.businessSummary).not.toContain("recorded control review");
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

  it("requires a positive source transition count before showing reviewed posture", () => {
    const outcome = buildDpmAiWorkflowOutcome(
      "outcome-narrative",
      buildDpmAiWorkflowResponse("outcome-narrative", {
        reviewState: "ACCEPTED",
        reviewTransitionCount: 0,
        outputLabel: "CLIENT_USE_APPROVED",
      }),
    );

    expect(outcome.disclosure).toMatchObject({
      humanReview: { state: "unavailable", sourceRecorded: false },
      clientUse: "blocked",
    });
    expect(outcome.disclosure.limitations).toContain(
      "The source did not publish the review record supporting its review state.",
    );
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
