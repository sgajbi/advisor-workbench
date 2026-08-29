import { describe, expect, it } from "vitest";

import {
  buildAdvisorCockpitEvidencePresentation,
  buildAdvisorCockpitModel,
} from "../../src/features/proposals/advisor-cockpit-view-model";
import type {
  AdvisorCockpitActionPageData,
  AdvisorCockpitPreparationPacketPageData,
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
      proposal_id: "proposal_sg_001",
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

const preparationPage: AdvisorCockpitPreparationPacketPageData = {
  total_count: 1,
  items: [
    {
      packet_id: "prep_gateway_1",
      context_type: "PROPOSAL",
      context_ref: "proposal_sg_001",
      status: "READY",
      evidence_refs: [{ summary: "Gateway preparation route evidence." }],
    },
  ],
};

describe("advisor cockpit view model", () => {
  it.each([
    {
      name: "initial loading",
      input: { isInitialLoading: true },
      state: "loading",
      title: "Loading advisor priorities",
      actionsEnabled: false,
    },
    {
      name: "permission restriction",
      input: { isPermissionBlocked: true, hasAnyEvidence: true },
      state: "permission-blocked",
      title: "Advisor Cockpit access is not available",
      actionsEnabled: false,
    },
    {
      name: "background confirmation",
      input: { isRefreshing: true, hasAnyEvidence: true },
      state: "refreshing",
      title: "Confirming advisor priorities",
      actionsEnabled: false,
    },
    {
      name: "failed confirmation with retained evidence",
      input: { hasRefreshFailure: true, hasAnyEvidence: true },
      state: "partial",
      title: "Advisor evidence is not fully confirmed",
      actionsEnabled: false,
    },
    {
      name: "complete unavailability",
      input: { isUnavailable: true },
      state: "unavailable",
      title: "Advisor Cockpit evidence is unavailable",
      actionsEnabled: false,
    },
    {
      name: "confirmed evidence",
      input: { hasAnyEvidence: true },
      state: "ready",
      title: null,
      actionsEnabled: true,
    },
  ])(
    "presents $name without promoting unsettled evidence",
    ({ input, state, title, actionsEnabled }) => {
      const presentation = buildAdvisorCockpitEvidencePresentation({
        isInitialLoading: false,
        isPermissionBlocked: false,
        isRefreshing: false,
        isUnavailable: false,
        hasRefreshFailure: false,
        hasAnyEvidence: false,
        ...input,
      });

      expect(presentation).toMatchObject({ state, title, actionsEnabled });
    },
  );

  it("keeps a known source failure partial while remaining evidence is still being checked", () => {
    expect(
      buildAdvisorCockpitEvidencePresentation({
        isInitialLoading: false,
        isPermissionBlocked: false,
        isRefreshing: true,
        isUnavailable: false,
        hasRefreshFailure: true,
        hasAnyEvidence: true,
      }),
    ).toMatchObject({
      state: "partial",
      title: "Advisor evidence is not fully confirmed",
      body: expect.stringContaining("Remaining checks are still in progress"),
      actionsEnabled: false,
    });
  });

  it("projects source-owned cockpit fields into business-facing rows without changing posture", () => {
    const model = buildAdvisorCockpitModel({
      snapshot,
      actionPage,
      preparationPage,
      supportability,
    });

    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Actions in scope", value: "1" }),
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
      sourceHandoff: {
        href: "/proposals/proposal_sg_001",
        label: "Open proposal",
        accessibleLabel: "Open proposal proposal_sg_001",
        recordLabel: "Proposal proposal_sg_001",
      },
    });
    expect(model.actionRows[0].reasonSummary).toBe(
      "Policy Pending Review, Client-ready Blocked",
    );
    expect(model.actionRows[0].unsupportedClaims).toBe(
      "Client-ready Publication",
    );
    expect(model.supportabilityRows).toContainEqual({
      label: "Preparation data",
      value: "Available",
      detail: "Required preparation data is published for internal advisor use.",
      tone: "success",
      state: "available",
    });
    expect(model.supportabilityRows).toContainEqual({
      label: "Client publication",
      value: "Blocked",
      detail: "Client-ready publication remains blocked by the source workflow.",
      tone: "danger",
      state: "blocked",
    });
    expect(model.operatingBoundaries).toEqual([
      {
        label: "Client communication unavailable",
        detail: "Client outreach remains outside this workspace.",
        rawValue: "EXTERNAL_CLIENT_COMMUNICATION",
        isRecognized: true,
      },
      {
        label: "Order workflow unavailable",
        detail: "Order routing and lifecycle actions remain outside this workspace.",
        rawValue: "OMS_ORDER_LIFECYCLE",
        isRecognized: true,
      },
    ]);
    expect(model.supportDetails).toEqual(
      expect.arrayContaining([
        {
          label: "Internal preparation source value",
          value: "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
        },
        {
          label: "Preparation data source value",
          value: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
        },
      ]),
    );
    expect(model.supportDetails).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "EXTERNAL_CLIENT_COMMUNICATION" }),
        expect.objectContaining({ value: "OMS_ORDER_LIFECYCLE" }),
      ]),
    );
    expect(model.preparationRows[0]).toMatchObject({
      packetId: "prep_gateway_1",
      context: "Proposal proposal_sg_001",
      status: "Ready",
    });
    expect(model.preparationCount).toBe(1);
    expect(model.preparationPosture).toBe("available");
    expect(model.actionPosture).toBe("actionable");
  });

  it.each([
    ["number", 42],
    ["object", { id: "proposal_sg_001" }],
    ["array", ["proposal_sg_001"]],
    ["blank", "   "],
    ["malformed path", "proposal/unsupported-path"],
    ["null", null],
    ["missing", undefined],
  ])(
    "fails closed when the runtime proposal reference is %s",
    (_case, proposalId) => {
      const invalidProposalPage = {
        ...actionPage,
        items: actionPage.items?.map((action) => ({
          ...action,
          proposal_id: proposalId,
          policy_evaluation_id: "policy_eval_sg_001",
          report_ref: "report_sg_001",
        })),
      } as unknown as AdvisorCockpitActionPageData;

      const model = buildAdvisorCockpitModel({
        snapshot,
        actionPage: invalidProposalPage,
        preparationPage,
        supportability,
      });

      expect(model.actionRows).toHaveLength(1);
      expect(model.actionRows[0]).toMatchObject({
        title: "Policy review required",
        sourceHandoff: null,
        canAcknowledge: true,
      });
      expect(model.actionRows[0].evidenceSummary).toBe(
        "Policy evaluation requires compliance review.",
      );
    },
  );

  it("normalizes a valid runtime proposal reference into the exact supported handoff", () => {
    const normalizedProposalPage: AdvisorCockpitActionPageData = {
      ...actionPage,
      items: actionPage.items?.map((action) => ({
        ...action,
        proposal_id: "  proposal_sg_001  ",
      })),
    };

    const model = buildAdvisorCockpitModel({
      snapshot,
      actionPage: normalizedProposalPage,
      preparationPage,
      supportability,
    });

    expect(model.actionRows[0].sourceHandoff).toEqual({
      href: "/proposals/proposal_sg_001",
      label: "Open proposal",
      accessibleLabel: "Open proposal proposal_sg_001",
      recordLabel: "Proposal proposal_sg_001",
    });
  });

  it("keeps a non-zero preparation scope partial when no packet detail is loaded", () => {
    const model = buildAdvisorCockpitModel({
      preparationPage: { items: [], total_count: 2 },
    });

    expect(model.preparationRows).toEqual([]);
    expect(model.preparationCount).toBe(2);
    expect(model.preparationPosture).toBe("details-unavailable");
  });

  it("reserves the clear preparation posture for a confirmed zero source scope", () => {
    const model = buildAdvisorCockpitModel({
      preparationPage: { items: [], total_count: 0 },
    });

    expect(model.preparationRows).toEqual([]);
    expect(model.preparationCount).toBe(0);
    expect(model.preparationPosture).toBe("clear");
  });

  it("keeps empty preparation evidence partial when the source total is not reported", () => {
    const model = buildAdvisorCockpitModel({
      preparationPage: { items: [], total_count: null },
    });

    expect(model.preparationRows).toEqual([]);
    expect(model.preparationCount).toBeNull();
    expect(model.preparationPosture).toBe("details-unavailable");
  });

  it("keeps loaded preparation evidence available when the full source total is not reported", () => {
    const model = buildAdvisorCockpitModel({
      preparationPage: { items: preparationPage.items },
    });

    expect(model.preparationRows).toHaveLength(1);
    expect(model.preparationCount).toBeNull();
    expect(model.preparationPosture).toBe("available");
  });

  it("keeps a non-zero source action count partial when no worklist row is loaded", () => {
    const model = buildAdvisorCockpitModel({
      actionPage: { items: [], total_count: 1 },
    });

    expect(model.metrics[0]).toMatchObject({
      label: "Actions in scope",
      value: "1",
      tone: "warn",
    });
    expect(model.actionRows).toEqual([]);
    expect(model.actionCount).toBe(1);
    expect(model.actionPosture).toBe("details-unavailable");
    expect(model.primaryDecision).toBe("Action review details unavailable");
    expect(model.recommendedAction).toBe(
      "1 action is reported in scope. Refresh or verify source readiness before client discussion.",
    );
  });

  it("reserves the clear posture for a confirmed zero source scope", () => {
    const model = buildAdvisorCockpitModel({
      actionPage: { items: [], total_count: 0 },
    });

    expect(model.actionCount).toBe(0);
    expect(model.actionRows).toEqual([]);
    expect(model.actionPosture).toBe("clear");
    expect(model.primaryDecision).toBe("No advisor actions require review");
  });

  it("keeps an empty worklist partial when the source total is not reported", () => {
    const model = buildAdvisorCockpitModel({
      actionPage: { items: [] },
    });

    expect(model.actionCount).toBeNull();
    expect(model.actionPosture).toBe("details-unavailable");
    expect(model.metrics[0]).toMatchObject({
      label: "Actions in scope",
      value: "Not reported",
      tone: "default",
    });
    expect(model.recommendedAction).toBe(
      "The action scope is not reported. Refresh or verify source readiness before client discussion.",
    );
  });

  it("keeps loaded actions actionable when the full source total is not reported", () => {
    const model = buildAdvisorCockpitModel({
      actionPage: { items: actionPage.items },
    });

    expect(model.actionCount).toBeNull();
    expect(model.actionPosture).toBe("actionable");
    expect(model.metrics[0]).toMatchObject({
      label: "Actions in scope",
      value: "At least 1",
      tone: "warn",
    });
  });

  it("fails unknown readiness values closed while retaining raw support evidence", () => {
    const model = buildAdvisorCockpitModel({
      snapshot: {
        supportability: {
          gateway_posture: "NEW_GATEWAY_POSTURE",
          workbench_posture: null,
          data_product_posture: "READY",
          client_ready_publication: "PENDING",
        },
      },
      supportability: {
        posture: "NEW_OVERALL_POSTURE",
        unsupported_capabilities: ["NEW_CAPABILITY"],
      },
    });

    expect(model.supportabilityRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Internal preparation",
          value: "Not reported",
          state: "not_reported",
          tone: "default",
        }),
        expect.objectContaining({
          label: "Client publication",
          value: "Not reported",
          state: "not_reported",
          tone: "default",
        }),
      ]),
    );
    expect(model.supportDetails).toEqual(
      expect.arrayContaining([
        {
          label: "Internal preparation source value",
          value: "NEW_OVERALL_POSTURE",
        },
        {
          label: "Client publication source value",
          value: "PENDING",
        },
      ]),
    );
    expect(model.supportDetails).toContainEqual({
      label: "Unrecognized operating boundary source value",
      value: "NEW_CAPABILITY",
    });
    expect(model.operatingBoundaries).toEqual([
      {
        label: "Additional workflow capability unavailable",
        detail:
          "The source reports another unsupported capability; see Support details.",
        rawValue: "NEW_CAPABILITY",
        isRecognized: false,
      },
    ]);
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
