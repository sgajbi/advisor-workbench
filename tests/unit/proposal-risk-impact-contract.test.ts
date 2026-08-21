import { describe, expect, it } from "vitest";

import { parseProposalRiskImpactEnvelope } from "../../src/features/proposals/proposal-risk-impact-contract";
import { proposalRiskImpactFixture } from "../fixtures/proposal-risk-impact";

describe("proposal risk and impact contract", () => {
  it("parses exact selected-proposal evidence", () => {
    const envelope = parseProposalRiskImpactEnvelope(
      proposalRiskImpactFixture(),
      "PRP-RISK",
      "PB_SG_GLOBAL_BAL_001",
      3,
      "RISK_REVIEW",
    );

    expect(envelope.contract_version).toBe("proposal-risk-impact.v1");
    expect(envelope.data.allocation.views[0]?.current?.buckets[0]?.weight).toBe(
      "0.6800",
    );
    expect(
      envelope.data.decision.approval_requirements[0]?.blocking_until_approved,
    ).toBe(true);
    expect(envelope.data.workflow_gate.gate).toBe("RISK_REVIEW_REQUIRED");
  });

  it("fails closed when the source version differs from the selected proposal version", () => {
    expect(() =>
      parseProposalRiskImpactEnvelope(
        proposalRiskImpactFixture(),
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        4,
        "RISK_REVIEW",
      ),
    ).toThrow(/version_no does not match the selected proposal version/);
  });

  it("fails closed when evidence has advanced beyond the selected lifecycle state", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.current_state = "COMPLIANCE_REVIEW";

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(
      /current_state does not match the selected proposal lifecycle state/,
    );
  });

  it.each([
    [
      "wrong contract version",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.contract_version = "proposal-risk-impact.v2" as never;
      },
    ],
    [
      "selected proposal mismatch",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.proposal_id = "PRP-OTHER";
      },
    ],
    [
      "selected portfolio mismatch",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.portfolio_id = "PB-OTHER";
      },
    ],
    [
      "JSON float weight",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.current!.buckets[0]!.weight =
          0.68 as never;
      },
    ],
    [
      "lowercase currency",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.current!.total_value.currency = "usd";
      },
    ],
    [
      "duplicate dimension",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.expected_dimensions.push("asset_class");
      },
    ],
    [
      "duplicate material-change identifier",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.material_changes.push({
          ...payload.data.decision.material_changes[0]!,
        });
      },
    ],
    [
      "duplicate approval-requirement identity",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.approval_requirements.push({
          ...payload.data.decision.approval_requirements[0]!,
          summary: "A second summary must not share the same source identity.",
        });
      },
    ],
    [
      "blocking approval requirement that is not required",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.approval_requirements[0]!.required = false;
      },
    ],
    [
      "duplicate missing-evidence identity",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        const evidence = {
          evidence_type: "CLIENT_CONTEXT",
          reason_code: "CLIENT_CONTEXT_MISSING",
          summary: "Current client context must be confirmed.",
          blocking: true,
          evidence_refs: [] as string[],
        };
        payload.data.decision.missing_evidence.push(evidence, {
          ...evidence,
          blocking: false,
          summary: "Conflicting copy for the same missing-evidence source.",
        });
      },
    ],
    [
      "duplicate workflow-gate reason identity",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.workflow_gate.reasons.push({
          ...payload.data.workflow_gate.reasons[0]!,
          severity: "LOW",
        });
      },
    ],
    [
      "duplicate risk highlight",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.risk.highlights.push(payload.data.risk.highlights[0]!);
      },
    ],
    [
      "unknown lifecycle vocabulary",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.current_state = "UNKNOWN" as never;
      },
    ],
  ])("fails closed on %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/Proposal risk and impact response was invalid/);
  });

  it("fails closed when capability supportability is omitted", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.capabilities = payload.data.capabilities.filter(
      ({ key }) => key !== "valuation_as_of",
    );

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/capability registry is incomplete/);
  });

  it("keeps approval requirement identities distinct when fields contain delimiters", () => {
    const payload = proposalRiskImpactFixture();
    const firstRequirement = payload.data.decision.approval_requirements[0]!;
    firstRequirement.policy_version = "policy:a";
    firstRequirement.reason_code = "reason";
    payload.data.decision.approval_requirements.push({
      ...firstRequirement,
      policy_version: "policy",
      reason_code: "a:reason",
      summary: "A structurally distinct source requirement.",
    });

    expect(
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ).data.decision.approval_requirements,
    ).toHaveLength(2);
  });

  it("keeps missing-evidence identities distinct when fields contain delimiters", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.decision.missing_evidence = [
      {
        evidence_type: "client:context",
        reason_code: "missing",
        summary: "Current context must be confirmed.",
        blocking: false,
        evidence_refs: [],
      },
      {
        evidence_type: "client",
        reason_code: "context:missing",
        summary: "Current context must be confirmed.",
        blocking: false,
        evidence_refs: [],
      },
    ];

    expect(
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ).data.decision.missing_evidence,
    ).toHaveLength(2);
  });

  it.each([
    [
      "decision status",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.decision_status = null;
      },
    ],
    [
      "decision summary",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.primary_summary = null;
      },
    ],
    [
      "top-level status",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.top_level_status = null;
      },
    ],
    [
      "recommended next action",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.recommended_next_action = null;
      },
    ],
    [
      "decision confidence",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.confidence = null;
      },
    ],
  ])("rejects a ready decision without %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/ready decision requires/);
  });

  it("rejects a decision status that contradicts the top-level status", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.decision.decision_status = "READY_FOR_CLIENT_REVIEW";
    payload.data.decision.top_level_status = "BLOCKED";
    payload.data.decision.recommended_next_action = "DISCUSS_WITH_CLIENT";

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/decision status does not match the top-level status/);
  });

  it("rejects a decision status that contradicts its next action", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.decision.recommended_next_action = "DISCUSS_WITH_CLIENT";

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/decision status does not match the recommended next action/);
  });

  it("rejects a decision status that contradicts the workflow gate", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.workflow_gate.gate = "EXECUTION_READY";
    payload.data.workflow_gate.recommended_next_step = "EXECUTE";
    payload.data.workflow_gate.reasons = [];

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/decision status does not match the workflow gate/);
  });

  it("accepts an insufficient-evidence decision beside a distinct review gate", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.decision.decision_status = "INSUFFICIENT_EVIDENCE";
    payload.data.decision.recommended_next_action = "REVISE_PROPOSAL";
    payload.data.decision.missing_evidence = [
      {
        evidence_type: "CLIENT_CONTEXT",
        reason_code: "MISSING_CLIENT_CONTEXT",
        summary: "Current client context must be confirmed.",
        blocking: true,
        evidence_refs: [],
      },
    ];

    expect(
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ).data.workflow_gate.gate,
    ).toBe("RISK_REVIEW_REQUIRED");
  });

  it.each([
    ["EXECUTION_READY", "EXECUTE"],
    ["NONE", "NONE"],
  ] as const)(
    "rejects an insufficient-evidence decision beside a ready %s gate",
    (gate, recommendedNextStep) => {
      const payload = proposalRiskImpactFixture();
      payload.data.decision.decision_status = "INSUFFICIENT_EVIDENCE";
      payload.data.decision.recommended_next_action = "REVISE_PROPOSAL";
      payload.data.decision.missing_evidence = [
        {
          evidence_type: "CLIENT_CONTEXT",
          reason_code: "MISSING_CLIENT_CONTEXT",
          summary: "Current client context must be confirmed.",
          blocking: true,
          evidence_refs: [],
        },
      ];
      payload.data.workflow_gate.gate = gate;
      payload.data.workflow_gate.recommended_next_step = recommendedNextStep;
      payload.data.workflow_gate.reasons = [];

      expect(() =>
        parseProposalRiskImpactEnvelope(
          payload,
          "PRP-RISK",
          "PB_SG_GLOBAL_BAL_001",
          3,
          "RISK_REVIEW",
        ),
      ).toThrow(/decision status does not match the workflow gate/);
    },
  );

  it.each([
    ["EXECUTION_READY", "EXECUTE"],
    ["NONE", "NONE"],
  ] as const)(
    "rejects blocking approval evidence beside a ready %s gate",
    (gate, recommendedNextStep) => {
      const payload = proposalRiskImpactFixture();
      payload.data.decision.decision_status = "REVISION_RECOMMENDED";
      payload.data.decision.recommended_next_action = "REVISE_PROPOSAL";
      payload.data.workflow_gate.gate = gate;
      payload.data.workflow_gate.recommended_next_step = recommendedNextStep;
      payload.data.workflow_gate.reasons = [];

      expect(() =>
        parseProposalRiskImpactEnvelope(
          payload,
          "PRP-RISK",
          "PB_SG_GLOBAL_BAL_001",
          3,
          "RISK_REVIEW",
        ),
      ).toThrow(
        /executable workflow gate cannot retain blocking decision evidence/,
      );
    },
  );

  it("rejects an insufficient-evidence decision without a blocking gap", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.decision.decision_status = "INSUFFICIENT_EVIDENCE";
    payload.data.decision.recommended_next_action = "REVISE_PROPOSAL";

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(
      /insufficient-evidence decision requires blocking missing evidence/,
    );
  });

  it.each([
    [
      "allocation_comparison",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.capabilities.find(
          ({ key }) => key === "allocation_comparison",
        )!.state = "unavailable";
      },
    ],
    [
      "proposal_risk_lens",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.capabilities.find(
          ({ key }) => key === "proposal_risk_lens",
        )!.state = "unavailable";
      },
    ],
    [
      "decision_posture",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.capabilities.find(
          ({ key }) => key === "decision_posture",
        )!.state = "unavailable";
      },
    ],
    [
      "workflow_gate",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.capabilities.find(
          ({ key }) => key === "workflow_gate",
        )!.state = "unavailable";
      },
    ],
  ])("rejects %s capability and evidence disagreement", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/capability state does not match its evidence/);
  });

  it.each([
    [
      "current snapshot",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.current = null;
      },
    ],
    [
      "proposed snapshot",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.proposed = null;
      },
    ],
  ])("rejects ready allocation without a %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/ready allocation requires/);
  });

  it.each([
    [
      "gate",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.workflow_gate.gate = null;
      },
    ],
    [
      "recommended next step",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.workflow_gate.recommended_next_step = null;
      },
    ],
  ])("rejects a ready workflow gate without %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/ready workflow gate requires/);
  });

  it.each([
    ["BLOCKED", "RISK_REVIEW"],
    ["RISK_REVIEW_REQUIRED", "FIX_INPUT"],
    ["EXECUTION_READY", "NONE"],
  ] as const)(
    "rejects a ready %s gate paired with %s",
    (gate, recommendedNextStep) => {
      const payload = proposalRiskImpactFixture();
      payload.data.workflow_gate.gate = gate;
      payload.data.workflow_gate.recommended_next_step = recommendedNextStep;

      expect(() =>
        parseProposalRiskImpactEnvelope(
          payload,
          "PRP-RISK",
          "PB_SG_GLOBAL_BAL_001",
          3,
          "RISK_REVIEW",
        ),
      ).toThrow(/workflow gate does not match the recommended next step/);
    },
  );

  it.each([
    [
      "source service",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.risk.source_service = null;
      },
    ],
    [
      "summary",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.risk.summary = "";
      },
    ],
  ])("rejects ready risk evidence without %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/ready risk evidence requires/);
  });

  it.each([
    [
      "missing source",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.source_service = null;
        payload.data.allocation.source_mode = null;
      },
    ],
    [
      "contradictory source",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.source_service = "lotus-advise";
        payload.data.allocation.source_mode = "LOTUS_CORE";
      },
    ],
    [
      "missing contract version",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.contract_version = null;
      },
    ],
    [
      "missing calculator version",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.calculator_version = null;
      },
    ],
  ])("rejects displayable allocation with %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/displayable allocation requires coherent source/);
  });

  it("accepts retained allocation views that an unavailable section withholds", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.overall_state = "partial";
    payload.data.allocation.state = "unavailable";
    payload.data.allocation.source_service = null;
    payload.data.allocation.source_mode = null;
    payload.data.allocation.contract_version = null;
    payload.data.allocation.calculator_version = null;
    payload.data.capabilities.find(
      ({ key }) => key === "allocation_comparison",
    )!.state = "unavailable";

    expect(
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ).data.allocation.state,
    ).toBe("unavailable");
  });

  it("rejects displayed partial risk observations without a named source", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.overall_state = "partial";
    payload.data.risk.state = "partial";
    payload.data.risk.source_service = null;
    payload.data.capabilities.find(
      ({ key }) => key === "proposal_risk_lens",
    )!.state = "partial";

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/displayable partial risk evidence requires source_service/);
  });

  it.each([
    "BLOCKED",
    "RISK_REVIEW_REQUIRED",
    "COMPLIANCE_REVIEW_REQUIRED",
    "CLIENT_CONSENT_REQUIRED",
  ] as const)("rejects a ready %s gate without reasons", (gate) => {
    const payload = proposalRiskImpactFixture();
    payload.data.workflow_gate.gate = gate;
    payload.data.workflow_gate.recommended_next_step = (
      {
        BLOCKED: "FIX_INPUT",
        RISK_REVIEW_REQUIRED: "RISK_REVIEW",
        COMPLIANCE_REVIEW_REQUIRED: "COMPLIANCE_REVIEW",
        CLIENT_CONSENT_REQUIRED: "REQUEST_CLIENT_CONSENT",
      } as const
    )[gate];
    payload.data.workflow_gate.reasons = [];

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        3,
        "RISK_REVIEW",
      ),
    ).toThrow(/ready blocking workflow gate requires at least one reason/);
  });
});
