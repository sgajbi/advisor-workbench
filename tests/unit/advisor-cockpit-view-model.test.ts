import { describe, expect, it } from "vitest";

import { buildAdvisorCockpitModel } from "../../src/features/proposals/advisor-cockpit-view-model";
import type {
  AdvisorCockpitActionPageData,
  AdvisorCockpitSnapshotData,
  AdvisorCockpitSupportabilityData,
} from "../../src/features/proposals/types";

const actionPage: AdvisorCockpitActionPageData = {
  total_count: 1,
  items: [
    {
      action_item_id: "aci_policy_review_001",
      action_item_version: 2,
      action_family: "POLICY_REVIEW_REQUIRED",
      status: "PENDING_REVIEW",
      priority: "HIGH",
      owner_role: "ADVISOR",
      owning_system: "lotus-advise",
      title: "Policy review required",
      next_required_action: "Review policy evidence before client discussion.",
      reason_codes: ["POLICY_PENDING_REVIEW", "CLIENT_READY_BLOCKED"],
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      sla_age_band: "DUE_SOON",
      evidence_refs: [
        {
          evidence_id: "policy_eval_sg_001",
          evidence_type: "POLICY_EVALUATION",
          source_system: "lotus-advise",
          access_class: "RESTRICTED_CUSTOMER_EVIDENCE",
          summary: "Policy evaluation requires compliance review.",
        },
      ],
      source_readiness_gaps: [
        {
          source_family: "policy",
          gap_code: "POLICY_REVIEW_PENDING",
          owner_role: "COMPLIANCE_REVIEWER",
          message:
            "Policy review is pending before client-ready posture can change.",
        },
      ],
      unsupported_capabilities: ["CLIENT_READY_PUBLICATION"],
      acknowledgement_state: { acknowledged: false },
    },
  ],
};

const snapshot: AdvisorCockpitSnapshotData = {
  snapshot_id: "cockpit_snapshot_1",
  as_of: "2026-05-27T08:00:00+00:00",
  action_counts: {
    "status.PENDING_REVIEW": 1,
    "status.BLOCKED": 0,
    "priority.HIGH": 1,
  },
  supportability: {
    gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
    workbench_posture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
    data_product_posture: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
    client_ready_publication: "BLOCKED",
  },
  preparation_packets: [
    {
      packet_id: "prep_1",
      context_type: "PORTFOLIO",
      context_ref: "PB_SG_GLOBAL_BAL_001",
      status: "READY",
      evidence_refs: [{ summary: "Proposal and policy evidence available." }],
    },
  ],
  unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
};

const supportability: AdvisorCockpitSupportabilityData = {
  posture: "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
  unsupported_capabilities: ["OMS_ORDER_LIFECYCLE"],
};

describe("advisor cockpit view model", () => {
  it("projects source-owned cockpit fields into business-facing rows without changing posture", () => {
    const model = buildAdvisorCockpitModel({
      snapshot,
      actionPage,
      supportability,
    });

    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Visible actions", value: "1" }),
        expect.objectContaining({ label: "Pending review", value: "1" }),
        expect.objectContaining({ label: "Blocked", value: "0" }),
        expect.objectContaining({ label: "High priority", value: "1" }),
      ]),
    );
    expect(model.primaryDecision).toBe("Policy review required");
    expect(model.recommendedAction).toBe(
      "Review policy evidence before client discussion.",
    );
    expect(model.actionRows[0]).toMatchObject({
      actionItemId: "aci_policy_review_001",
      actionItemVersion: 2,
      status: "Pending Review",
      priority: "High",
      owner: "Advisor",
      family: "Policy Review Required",
      sla: "Due Soon",
      canAcknowledge: true,
    });
    expect(model.actionRows[0].reasonSummary).toBe(
      "Policy Pending Review, Client-ready Blocked",
    );
    expect(model.actionRows[0].unsupportedClaims).toBe(
      "Client-ready Publication",
    );
    expect(model.supportabilityRows).toContainEqual({
      label: "Data product posture",
      value: "Active Advisor Cockpit Products RFC 0026",
    });
    expect(model.supportabilityRows).toContainEqual({
      label: "Client publication",
      value: "Blocked",
    });
    expect(model.unsupportedClaims).toEqual([
      "External Client Communication",
      "OMS Order Lifecycle",
    ]);
    expect(model.preparationRows[0]).toMatchObject({
      packetId: "prep_1",
      context: "Portfolio PB_SG_GLOBAL_BAL_001",
      status: "Ready",
    });
  });

  it("does not offer local acknowledgement for external-owner actions", () => {
    const externalOwnerPage: AdvisorCockpitActionPageData = {
      items: [
        {
          ...actionPage.items![0],
          owner_role: "COMPLIANCE_REVIEWER",
          acknowledgement_state: { acknowledged: false },
        },
      ],
    };

    const model = buildAdvisorCockpitModel({ actionPage: externalOwnerPage });

    expect(model.actionRows[0].canAcknowledge).toBe(false);
    expect(model.actionRows[0].acknowledgementLabel).toBe("External owner");
    expect(model.actionRows[0].acknowledgementDetail).toBe(
      "Compliance Reviewer remains the owning role.",
    );
  });
});
