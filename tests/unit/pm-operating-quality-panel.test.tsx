import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PmOperatingQualityPanel from "../../src/features/workbench/components/pm-operating-quality-panel";
import {
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityScoreRun,
} from "../../src/features/workbench/api";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/api", () => ({
  previewDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  previewDpmPmOperatingQualityScoreRun: vi.fn(),
}));

const policies: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-policy",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
    blocked_actions: [],
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
    count: 2,
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
        reason_codes: ["PM_QUALITY_READY"],
        forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
      },
    ],
    fairness_segments: [
      {
        segment_id: "mandate_balanced",
        segment_type: "MANDATE_TYPE",
        display_name: "Balanced DPM Mandates",
        score_run_ids: ["pmq_run_001"],
        source_refs: [
          {
            source_system: "lotus-core",
            source_type: "MandateTypeSegment",
            source_id: "balanced",
          },
        ],
      },
      {
        segment_id: "mandate_income",
        segment_type: "MANDATE_TYPE",
        display_name: "Income DPM Mandates",
        score_run_ids: ["pmq_run_002"],
      },
    ],
  },
};

describe("PmOperatingQualityPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders PM quality evidence without exposing hashes or claiming ranking decisions", () => {
    render(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);

    expect(screen.getByRole("heading", { name: "PM Operating Quality" })).toBeInTheDocument();
    expect(screen.getByText("Score-Run Evidence")).toBeInTheDocument();
    expect(screen.getByText("Governance Posture")).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality Gateway operation evidence")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality command readiness")
    ).toBeInTheDocument();
    expect(screen.getByText("Score Preview Command")).toBeInTheDocument();
    expect(screen.getByText("Fairness Preview Command")).toBeInTheDocument();
    expect(screen.getByText(/no scoring, ranking, trade approval/i)).toBeInTheDocument();
    expect(screen.getByText("Score-run evidence load")).toBeInTheDocument();
    expect(screen.getByText("corr-score")).toBeInTheDocument();
    expect(
      screen.getAllByText("Ready for policy pmq_sg_dpm / 2026.05").length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Ready: 2 source-defined segments from Manage").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Source Segments")).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality source segments")).toBeInTheDocument();
    expect(
      screen.getByText("System: lotus-core | Product: MandateTypeSegment | Id: balanced")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeEnabled();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.getByText(/does not rank PMs/i)).toBeInTheDocument();
  });

  it("explains when score-run preview is blocked by missing policy context", () => {
    render(
      <PmOperatingQualityPanel
        policies={{
          ...policies,
          supportability: {
            ...policies.supportability,
            policy_id: null,
            policy_version: null,
          },
          data: { policies: [] },
        }}
        scoreRuns={{
          ...scoreRuns,
          supportability: {
            ...scoreRuns.supportability,
            policy_id: null,
            policy_version: null,
          },
          data: { score_runs: [] },
        }}
      />
    );

    expect(
      screen.getAllByText("Blocked until Manage returns policy id and version").length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Preview Score Run" })).toBeDisabled();
    expect(previewDpmPmOperatingQualityScoreRun).not.toHaveBeenCalled();
  });

  it("classifies Gateway action failures without calling Manage directly", async () => {
    vi.mocked(previewDpmPmOperatingQualityScoreRun).mockRejectedValue(
      new Error("Failed to fetch preview DPM PM operating quality score run (409)")
    );

    render(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview Score Run" }));

    await waitFor(() => {
      expect(previewDpmPmOperatingQualityScoreRun).toHaveBeenCalledWith({
        policyId: "pmq_sg_dpm",
        policyVersion: "2026.05",
      });
    });
    expect(
      screen.getByLabelText("PM operating quality action error posture")
    ).toBeInTheDocument();
    expect(screen.getByText("business blocked")).toBeInTheDocument();
    expect(screen.getByText("409")).toBeInTheDocument();
    expect(screen.getByText("Gateway PM operating quality route")).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch preview DPM PM operating quality score run/)).toBeInTheDocument();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("explains when fairness preview is blocked by missing source-defined segments", () => {
    render(
      <PmOperatingQualityPanel
        policies={policies}
        scoreRuns={{
          ...scoreRuns,
          data: {
            ...scoreRuns.data,
            fairness_segments: [
              {
                segment_id: "mandate_balanced",
                segment_type: "MANDATE_TYPE",
                display_name: "Balanced DPM Mandates",
                score_run_ids: ["pmq_run_001"],
              },
            ],
          },
        }}
      />
    );

    expect(
      screen.getAllByText("Blocked: 1 source-defined segment returned").length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeDisabled();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("keeps Manage action-register blocks visible before command execution", () => {
    render(
      <PmOperatingQualityPanel
        policies={policies}
        scoreRuns={{
          ...scoreRuns,
          supportability: {
            ...scoreRuns.supportability,
            state: "BLOCKED",
            blocked_actions: ["PREVIEW_FAIRNESS_ANALYSIS"],
          },
        }}
      />
    );

    expect(screen.getByLabelText("PM operating quality command readiness")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked by Manage action register").length).toBeGreaterThan(0);
    expect(
      screen.getByText("PREVIEW_FAIRNESS_ANALYSIS (lotus-manage)")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview Fairness" }));
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("previews fairness analysis through Gateway with source-defined segments only", async () => {
    vi.mocked(previewDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue({
      ...scoreRuns,
      correlation_id: "corr-pmq-fairness",
      supportability: {
        ...scoreRuns.supportability,
        state: "PENDING_REVIEW",
        reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
        fairness_analysis_id: "pmq_fair_001",
      },
      data: {
        fairness_analysis: {
          product_name: "PmOperatingQualityFairnessAnalysis",
          product_version: "v1",
          fairness_analysis_id: "pmq_fair_001",
          state: "PENDING_REVIEW",
          as_of_date: "2026-05-13",
          minimum_segment_score_run_count: 2,
          maximum_average_score_spread: "15.00",
          observed_average_score_spread: "31.00",
          generated_at: "2026-05-13T09:40:00Z",
          generated_by: "lotus-manage",
          forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
          source_refs: [
            {
              source_system: "lotus-manage",
              source_product: "PmOperatingQualityScoreRun",
              source_id: "pmq_run_001",
            },
          ],
          reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
          segment_results: [
            {
              segment_id: "mandate_balanced",
              segment_type: "MANDATE_TYPE",
              display_name: "Balanced DPM Mandates",
              state: "READY",
              score_run_count: 1,
              average_score: "90.00",
              minimum_score: "90.00",
              maximum_score: "90.00",
              score_run_refs: [
                {
                  source_system: "lotus-manage",
                  source_product: "PmOperatingQualityScoreRun",
                  source_id: "pmq_run_001",
                },
              ],
              source_refs: [
                {
                  source_system: "lotus-core",
                  source_type: "MandateTypeSegment",
                  source_id: "balanced",
                },
              ],
              reason_codes: ["PM_QUALITY_SEGMENT_READY"],
            },
          ],
        },
      },
    });

    render(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview Fairness" }));

    await waitFor(() => {
      expect(previewDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith({
        policyId: "pmq_sg_dpm",
        policyVersion: "2026.05",
        asOfDate: "2026-05-13",
        segments: [
            {
              segment_id: "mandate_balanced",
              segment_type: "MANDATE_TYPE",
              display_name: "Balanced DPM Mandates",
              score_run_ids: ["pmq_run_001"],
              source_refs: [
                {
                  source_system: "lotus-core",
                  source_type: "MandateTypeSegment",
                  source_id: "balanced",
                },
              ],
            },
          {
            segment_id: "mandate_income",
            segment_type: "MANDATE_TYPE",
            display_name: "Income DPM Mandates",
            score_run_ids: ["pmq_run_002"],
          },
        ],
      });
    });
    expect(previewDpmPmOperatingQualityScoreRun).not.toHaveBeenCalled();
    expect(screen.getByText("Fairness preview returned Manage segment evidence.")).toBeInTheDocument();
    expect(screen.getByText("Fairness analysis preview")).toBeInTheDocument();
    expect(screen.getByText("corr-pmq-fairness")).toBeInTheDocument();
    expect(screen.getByText("Fairness Preview Detail")).toBeInTheDocument();
    expect(screen.getByText("PmOperatingQualityFairnessAnalysis / v1")).toBeInTheDocument();
    expect(screen.getByText("15.00")).toBeInTheDocument();
    expect(screen.getAllByText("31.00").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("System: lotus-manage | Product: PmOperatingQualityScoreRun | Id: pmq_run_001")
        .length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/protected class inference/i).length).toBeGreaterThan(0);
  });
});
