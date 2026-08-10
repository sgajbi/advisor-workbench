import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualityReviewActionsCard from "../../src/features/workbench/components/pm-operating-quality-review-actions-card";
import { buildPmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const scoreRuns: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-score",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    score_runs: [
      {
        score_run_id: "pmq_run_001",
        pm_id: "PM_SG_001",
        book_id: "PM_BOOK_SG_BALANCED",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        state: "READY",
        score: "90.00",
        as_of_date: "2026-05-13",
        content_hash: "sha256:pm-quality",
      },
    ],
  },
};

const reviewActions: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-review-actions",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    review_action_id: "pmq_review_001",
    reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
  },
  data: {
    review_actions: [
      {
        review_action_id: "pmq_review_001",
        review_action_ref: "PMQ-RA-001",
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        action_type: "SUPERVISORY_REVIEW",
        action_state: "PENDING_REVIEW",
        actor_id: "supervisor_sg_1",
        as_of_date: "2026-05-13",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
        operating_boundaries: ["NO_CLIENT_COMMUNICATION", "NO_TRADE_OR_EXECUTION"],
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualityReviewAction",
            source_id: "pmq_review_001",
          },
        ],
      },
    ],
  },
};

const reviewActionDetail: DpmPmOperatingQualityGatewayResponse = {
  ...reviewActions,
  correlation_id: "corr-review-action-detail",
  data: {
    review_action: {
      review_action_id: "pmq_review_001",
      review_action_ref: "PMQ-RA-001",
      target_type: "SCORE_RUN",
      target_id: "pmq_run_001",
      action_type: "SUPERVISORY_REVIEW",
      action_state: "PENDING_REVIEW",
      actor_id: "supervisor_sg_1",
      as_of_date: "2026-05-13",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      bounded_review_rationale:
        "Bounded supervisory review of source-owned PM quality posture.",
      review_reason: "Gateway bounded supervisory review reason.",
      review_rationale: "raw rationale from Manage must not render",
      reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
      forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityReviewAction",
          source_id: "pmq_review_001",
        },
      ],
    },
  },
};

describe("PmOperatingQualityReviewActionsCard", () => {
  it("renders selected review-action detail without a duplicate record ledger", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
      reviewActions,
      reviewActionDetail,
    });

    render(<PmOperatingQualityReviewActionsCard model={model} />);

    expect(screen.getByText("Supervisory Review Action Detail")).toBeInTheDocument();
    expect(screen.getByText("Review action returned by Gateway")).toBeInTheDocument();
    expect(screen.getAllByText("PMQ-RA-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Score Run / pmq_run_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supervisory Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Bounded supervisory review of source-owned PM quality posture.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Client Contact (client_contact), OMS Routing (oms_routing), Trade Execution (trade_execution)"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("PM operating quality supervisory review actions")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.queryByText("raw rationale from Manage must not render")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
  });

  it("delegates bounded review-action control rendering when command props are provided", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
      reviewActions,
      reviewActionDetail,
    });

    render(
      <PmOperatingQualityReviewActionsCard
        model={model}
        form={{
          actorId: "supervisor_sg_1",
          targetType: "SCORE_RUN",
          targetId: "pmq_run_001",
          actionType: "REQUEST_EVIDENCE_REMEDIATION",
          actionState: "REVIEW_REQUIRED",
          reviewActionRef: "PMQ-RA-001",
          boundedRationale: "Bounded supervisory action rationale.",
        }}
        readiness={{ state: "READY", detail: "Ready to preview score run pmq_run_001" }}
        previewReady={false}
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        onFormChange={() => undefined}
        onPreview={() => undefined}
        onCreate={() => undefined}
      />
    );

    expect(
      screen.getByLabelText("PM operating quality supervisory review-action control")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Supervisor actor")).toHaveValue("supervisor_sg_1");
    expect(screen.getByText("Preview required before create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Review Action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Review Action" })).toBeDisabled();
  });

  it("renders fail-closed empty posture when no review action is returned", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
    });

    render(<PmOperatingQualityReviewActionsCard model={model} />);

    expect(screen.getByText("No detail")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Manage review-action detail")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("PM operating quality supervisory review actions")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
