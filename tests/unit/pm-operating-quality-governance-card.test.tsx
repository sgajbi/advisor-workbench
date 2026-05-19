import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualityGovernanceCard from "../../src/features/workbench/components/pm-operating-quality-governance-card";
import { buildPmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const policies: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-policy",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "BLOCKED",
    reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
    blocked_actions: ["PREVIEW_FAIRNESS_ANALYSIS"],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    policies: [
      {
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        enabled: true,
        state: "READY",
        as_of_date: "2026-05-13",
      },
    ],
  },
};

const scoreRuns: DpmPmOperatingQualityGatewayResponse = {
  ...policies,
  correlation_id: "corr-score",
  supportability: {
    ...policies.supportability,
    state: "BLOCKED",
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
        forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
        reason_codes: ["PM_QUALITY_READY"],
      },
    ],
    fairness_segments: [
      {
        segment_id: "mandate_balanced",
        segment_type: "MANDATE_TYPE",
        display_name: "Balanced DPM Mandates",
        score_run_ids: ["pmq_run_001"],
      },
    ],
  },
};

describe("PmOperatingQualityGovernanceCard", () => {
  it("renders source-owned governance posture without command controls", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
    });

    render(<PmOperatingQualityGovernanceCard model={model} />);

    expect(screen.getByText("Governance Posture")).toBeInTheDocument();
    expect(screen.getByText("Forbidden Uses")).toBeInTheDocument();
    expect(screen.getByText(/protected_class_inference/i)).toBeInTheDocument();
    expect(screen.getByText(/autonomous_pm_ranking/i)).toBeInTheDocument();
    expect(screen.getByText("Score Preview Readiness")).toBeInTheDocument();
    expect(screen.getByText("Blocked by Manage action register")).toBeInTheDocument();
    expect(screen.getByText("Source Segments")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText("Persisted Analyses")).toBeInTheDocument();
    expect(screen.getByText("Policy Versions")).toBeInTheDocument();
    expect(screen.getByText(/Workbench preserves Gateway, Manage, and review-gated AI evidence only/i))
      .toBeInTheDocument();
    expect(screen.getByText(/It does not rank PMs, calculate PM quality/i)).toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/approve trades/i)).toBeInTheDocument();
  });
});
