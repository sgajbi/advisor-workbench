import { describe, expect, it } from "vitest";

import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueModel,
} from "../../src/features/proposals/proposal-policy-review-view-model";

describe("proposal policy review view model", () => {
  it("turns policy evaluation records into advisor-facing suitability review rows", () => {
    const model = buildPolicyReviewQueueModel({
      records: [
        {
          evaluation_id: "pev_001",
          proposal_id: "PRP-SUITABILITY",
          proposal_version_id: "ppv_001",
          policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
          policy_version: "2026.05",
          evaluation_status: "PENDING_REVIEW",
          approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
          disclosure_requirements: ["advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"],
          consent_requirements: [],
          source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
        },
      ],
    });

    expect(model.totalCount).toBe(1);
    expect(model.actionCount).toBe(1);
    expect(model.rows[0]).toMatchObject({
      evaluationId: "pev_001",
      proposalId: "PRP-SUITABILITY",
      proposalVersion: "ppv_001",
      policyPack: "SG Private Banking Reference / 2026.05",
      policyStatus: "Review required",
      signOffStatus: "Sign-off pending",
      openRequirements: "1 approval dependency, 1 disclosure review",
      evidencePosture: "1 evidence gap",
      nextAction: "Complete required approval review.",
      href: "/proposals/PRP-SUITABILITY",
    });
    expect(JSON.stringify(model)).not.toContain("PENDING_REVIEW");
    expect(JSON.stringify(model)).not.toContain("advisor_reviewed_disclosure");
  });

  it("keeps ready evaluations distinct from blocked reviews", () => {
    const model = buildPolicyReviewQueueModel({
      records: [
        {
          evaluation_id: "pev_ready",
          proposal_id: "PRP-READY",
          proposal_version_id: "ppv_ready",
          policy_pack_id: "GLOBAL_PRIVATE_BANKING_BASELINE",
          policy_version: "2026.05",
          evaluation_status: "READY",
          sign_off_events_json: [{ event_type: "POLICY_EVALUATION_SIGN_OFF_RECORDED" }],
        },
        {
          evaluation_id: "pev_blocked",
          proposal_id: "PRP-BLOCKED",
          proposal_version_id: "ppv_blocked",
          policy_pack_id: "GLOBAL_PRIVATE_BANKING_BASELINE",
          policy_version: "2026.05",
          evaluation_status: "BLOCKED",
          source_gaps: ["missing_mandate_evidence"],
        },
      ],
    });

    expect(model.actionCount).toBe(1);
    expect(model.rows[0].policyStatus).toBe("Ready");
    expect(model.rows[0].signOffStatus).toBe("Sign-off recorded");
    expect(model.rows[1].policyStatus).toBe("Blocked");
    expect(model.rows[1].nextAction).toBe("Resolve blocking policy evidence before advisor sign-off.");
  });

  it("builds selected policy evidence without exposing source payload names", () => {
    const model = buildPolicyEvaluationEvidenceModel({
      evaluation: {
        evaluation_id: "pev_001",
        evaluation_status: "PENDING_REVIEW",
        evaluation_hash: "sha256:policy-evaluation-1",
        source_refs: ["lotus-core:core_product_eligibility_target_market_complexity"],
        source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
        approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
        disclosure_requirements: ["advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"],
        consent_requirements: ["client_consent:SG_STRUCTURED_NOTE"],
        evaluation_json: {
          rule_results: [
            { rule_id: "SG_COMPLEX_PRODUCT_DISCLOSURE_REVIEW", status: "PENDING_REVIEW" },
            { rule_id: "MANDATE_ALIGNMENT", status: "READY" },
          ],
        },
      },
      signOffPackage: {
        package_posture: {
          sign_off_source_package: "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
          client_ready_publication: "BLOCKED",
        },
        lineage: {
          audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
          lineage_posture: { client_ready_publication: "BLOCKED" },
        },
      },
      workflow: {
        sign_off_status: "PENDING_REVIEW",
        sign_off_blockers: [
          "DISCLOSURE_REQUIREMENT_OPEN:advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
        ],
        maker_checker_required: true,
        sla_posture: { status: "WITHIN_SLA", open_requirement_count: 3 },
        client_ready_publication: "BLOCKED",
      },
    });

    expect(model).toMatchObject({
      evaluationId: "pev_001",
      sourceEvaluationHash: "sha256:policy-evaluation-1",
      policyStatus: "Review required",
      sourcePosture: "1 evidence gap",
      ruleCount: 2,
      blockingRuleCount: 0,
      signOffPackagePosture: "Source package available",
      clientPublicationPosture: "Client publication blocked",
      approvalDependencies: ["SG Structured Note"],
      disclosureRequirements: ["SG Structured Note"],
      consentRequirements: ["SG Structured Note"],
      sourceRefs: ["Core Product Eligibility Target Market Complexity"],
      sourceGaps: ["SG Structured Note"],
      workflowStatus: "Review required",
      makerCheckerPosture: "Independent checker required",
      slaPosture: "Within review SLA, 3 open",
      workflowBlockers: ["SG Structured Note"],
    });
    expect(JSON.stringify(model)).not.toContain("client_consent");
    expect(JSON.stringify(model)).not.toContain("SUPPORTED_BY_RFC0025");
    expect(JSON.stringify(model)).not.toContain("DISCLOSURE_REQUIREMENT_OPEN");
  });
});
