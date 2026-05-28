import { describe, expect, it } from "vitest";

import { buildBankDemoProofModel } from "../../src/features/proposals/bank-demo-proof-view-model";

describe("bank demo proof view model", () => {
  it("keeps source-owned supported-claim classifications and blocked publication posture visible", () => {
    const model = buildBankDemoProofModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      scenario: {
        scenario_id: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
        primary_portfolio_id: "PB_SG_GLOBAL_BAL_001",
        governed_as_of_date: "2026-05-28",
        proof_marker: "BANK_DEMO_PROOF_PACK_CREATED",
        required_source_products: ["AdvisoryPolicyEvaluationRecord:v1"],
        unsupported_boundaries: [
          "Client-ready publication remains blocked until publication controls are validated.",
        ],
        steps: [
          {
            step_id: "advisor_cockpit_operating_snapshot",
            title: "Advisor reviews source-backed cockpit actions",
            owner_repository: "lotus-advise",
            required_evidence_refs: ["proof.assets.sanitized_runtime_summary"],
            required_workbench_panels: ["advisor_cockpit"],
          },
        ],
      },
      claimRegister: {
        scenario_id: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
        primary_portfolio_id: "PB_SG_GLOBAL_BAL_001",
        proof_marker: "BANK_DEMO_PROOF_PACK_CREATED",
        artifact_policy: {
          sensitive_material_rules: [
            "Secrets, tokens, prompts, and raw runtime logs stay local.",
          ],
        },
        claims: [
          {
            claim_id: "advisor_journey_backend_evidence_available",
            title: "Advisor journey backend evidence available",
            classification: "BACKEND_BACKED_UI_PENDING",
            audiences: ["CLIENT_DEMO"],
            allowed_materials: ["DEMO_SCRIPT"],
            claim_text:
              "The advisory backend can prove advisor journey evidence before product-surface promotion.",
            proof_requirements: [
              {
                requirement_id: "rfc0028-backend-advisor-journey-review",
              },
            ],
            wording_rules: ["Do not use screenshots for this claim yet."],
          },
          {
            claim_id: "client_ready_publication_blocked",
            title: "Client-ready publication is blocked",
            classification: "UNSUPPORTED",
            audiences: ["SALES"],
            allowed_materials: ["WIKI"],
            claim_text:
              "Client-ready publication and external client communication are not supported.",
          },
        ],
      },
    });

    expect(model.scenarioId).toBe("RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL");
    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Client Publication",
          value: "Blocked",
          tone: "danger",
        }),
      ]),
    );
    expect(model.steps[0]).toMatchObject({
      owner: "Lotus Advise",
      evidenceRefs: "Sanitized Runtime Summary",
      workbenchPanels: "Advisor Cockpit",
    });
    expect(model.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Advisor journey backend evidence available",
          classification: "Backend Backed UI Pending",
          classificationTone: "warn",
          proofRequirements: "RFC0028 Backend Advisor Journey Review",
        }),
        expect.objectContaining({
          title: "Client-ready publication is blocked",
          classification: "Unsupported",
          classificationTone: "danger",
          isClientFacingBlocked: true,
        }),
      ]),
    );
    expect(model.sourceProducts).toEqual(["Advisory Policy Evaluation Record"]);
  });
});
