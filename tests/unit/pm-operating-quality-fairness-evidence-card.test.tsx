import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualityFairnessEvidenceCard from "../../src/features/workbench/components/pm-operating-quality-fairness-evidence-card";
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

const fairnessAnalysis: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-fairness",
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
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      state: "PENDING_REVIEW",
      as_of_date: "2026-05-13",
      minimum_segment_score_run_count: 2,
      maximum_average_score_spread: "15.00",
      observed_average_score_spread: "18.00",
      generated_at: "2026-05-13T10:40:00Z",
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
};

describe("PmOperatingQualityFairnessEvidenceCard", () => {
  it("renders Gateway-backed fairness detail and source segments without command controls", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
      fairnessAnalysisDetail: fairnessAnalysis,
    });

    render(<PmOperatingQualityFairnessEvidenceCard model={model} />);

    expect(screen.getByText("Fairness Analysis Detail")).toBeInTheDocument();
    expect(screen.getByText("Fairness analysis returned by Gateway")).toBeInTheDocument();
    expect(screen.getByText("PmOperatingQualityFairnessAnalysis / v1")).toBeInTheDocument();
    expect(screen.getAllByText("pmq_fair_001").length).toBeGreaterThan(0);
    expect(screen.getByText("15.00")).toBeInTheDocument();
    expect(screen.getAllByText("18.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Balanced DPM Mandates").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("System: lotus-core | Product: MandateTypeSegment | ID: balanced")
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "PM Quality Fairness Spread Review Required (PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED)"
      ).length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /preview fairness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /persist fairness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
  });

  it("renders fail-closed empty posture when no fairness detail exists", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
    });

    render(<PmOperatingQualityFairnessEvidenceCard model={model} />);

    expect(screen.getByText("No detail")).toBeInTheDocument();
    expect(screen.getByText("Awaiting persisted analysis detail or preview")).toBeInTheDocument();
    expect(screen.getByText("No persisted fairness analyses returned")).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality source segments")).toBeInTheDocument();
    expect(screen.getByText("Balanced DPM Mandates")).toBeInTheDocument();
    expect(screen.getByText("Run a Manage fairness preview to inspect source-defined segment posture."))
      .toBeInTheDocument();
  });
});
