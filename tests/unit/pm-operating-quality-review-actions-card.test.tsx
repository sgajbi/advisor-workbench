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
      review_rationale: "Review source-owned PM quality posture with investment control.",
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
  it("renders review-action ledger and detail without unsupported workflow controls", () => {
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
      screen.getByText("Review source-owned PM quality posture with investment control.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Client Contact (client_contact), OMS Routing (oms_routing), Trade Execution (trade_execution)"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality supervisory review actions")
    ).toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
  });

  it("renders fail-closed empty posture when no review action is returned", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
    });

    render(<PmOperatingQualityReviewActionsCard model={model} />);

    expect(screen.getByText("No detail")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Manage review-action detail")).toBeInTheDocument();
    expect(screen.getByText("No supervisory review actions returned")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Workbench waits for Manage-persisted PM quality review actions through Gateway."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
