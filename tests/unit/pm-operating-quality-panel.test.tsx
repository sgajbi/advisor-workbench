import { fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import PmOperatingQualityPanel from "../../src/features/workbench/components/pm-operating-quality-panel";
import {
  createDpmPmOperatingQualitySummaryInvocation,
  createDpmPmOperatingQualityFairnessAnalysis,
  createDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  previewDpmPmOperatingQualitySummaryInvocation,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityReviewAction,
  previewDpmPmOperatingQualityScoreRun,
  requestDpmPmOperatingQualitySummary,
} from "../../src/features/workbench/pm-operating-quality-api";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "../../src/features/workbench/types";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

vi.mock("../../src/features/workbench/pm-operating-quality-api", () => ({
  buildDpmPmOperatingQualityReviewActionCorrelationId: vi.fn(
    () => "corr-workbench-pm-quality-review-action-panel-test"
  ),
  buildDpmPmOperatingQualitySummaryInvocationCorrelationId: vi.fn(
    () => "corr-workbench-pm-quality-summary-invocation-panel-test"
  ),
  createDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  createDpmPmOperatingQualityReviewAction: vi.fn(),
  createDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  getDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  getDpmPmOperatingQualityReviewAction: vi.fn(),
  getDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  previewDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  previewDpmPmOperatingQualityReviewAction: vi.fn(),
  previewDpmPmOperatingQualityScoreRun: vi.fn(),
  previewDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  requestDpmPmOperatingQualitySummary: vi.fn(),
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
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualityScoreRun",
            source_id: "pmq_run_001",
          },
        ],
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

const summaryResponse: DpmPmOperatingQualitySummaryResponse = {
  correlation_id: "corr-pmq-summary",
  contract_version: "v1",
  source_service: "lotus-ai",
  evidence_source_service: "lotus-manage",
  manage_upstream_status: 200,
  ai_upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    score_run_id: "pmq_run_001",
  },
  score_run: {
    score_run_id: "pmq_run_001",
    content_hash: "sha256:pm-quality",
  },
  summary_request: {
    requested_outputs: ["score_run_summary", "governance_summary"],
    audience: ["portfolio_manager", "investment_control"],
  },
  data: buildDpmAiWorkflowExecution("pm-quality-summary", {
    runId: "packrun_pmq_1",
    structuredOutput: { summary_status: "REVIEW_REQUIRED" },
  }),
};

const fairnessAnalysisResponse: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-fairness-create",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    fairness_analysis_id: "pmq_fair_002",
  },
  data: {
    fairness_analysis: {
      product_name: "PmOperatingQualityFairnessAnalysis",
      product_version: "v1",
      fairness_analysis_id: "pmq_fair_002",
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

const reviewActions: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-review-actions",
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
  correlation_id: "corr-pmq-review-action-detail",
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

const summaryInvocationItem = {
  summary_invocation_id: "pmq_summary_001",
  summary_ref: "PMQ-SUMMARY-001",
  score_run_id: "pmq_run_001",
  review_action_id: "pmq_review_001",
  invocation_state: "PENDING_REVIEW",
  workflow_run_id: "wf_pmq_summary_001",
  summary_artifact_ref: "artifact://pmq-summary/001",
  summary_content_hash: "sha256:summary-invocation",
  requested_by: "supervisor_sg_1",
  as_of_date: "2026-05-13",
  policy_id: "pmq_sg_dpm",
  policy_version: "2026.05",
  reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
  text_boundary: {
    generated_summary_text_stored: false,
    prompt_body_stored: false,
    model_response_stored: false,
    client_communication_projected: false,
    order_or_oms_projected: false,
  },
  generated_summary_text: "Raw generated PM summary narrative must stay hidden.",
  prompt_body: "Prompt body must stay hidden.",
  model_response: "Model response must stay hidden.",
  source_refs: [
    {
      source_system: "lotus-manage",
      source_product: "PmOperatingQualitySummaryInvocation",
      source_id: "pmq_summary_001",
    },
  ],
};

const summaryInvocations: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-summary-invocations",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    summary_invocation_id: "pmq_summary_001",
    review_action_id: "pmq_review_001",
    reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
    count: 1,
  },
  data: {
    summary_invocations: [summaryInvocationItem],
  },
};

const summaryInvocationDetail: DpmPmOperatingQualityGatewayResponse = {
  ...summaryInvocations,
  correlation_id: "corr-pmq-summary-invocation-detail",
  data: {
    summary_invocation: {
      ...summaryInvocationItem,
      workflow_pack_name: "pm-operating-quality-summary",
      workflow_pack_version: "2026.05",
      forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
    },
  },
};


function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return baseRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("PmOperatingQualityPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders PM quality evidence without exposing hashes or claiming ranking decisions", () => {
    renderWithQueryClient(
      <PmOperatingQualityPanel
        policies={policies}
        scoreRuns={scoreRuns}
        reviewActions={reviewActions}
        reviewActionDetail={reviewActionDetail}
        summaryInvocations={summaryInvocations}
        summaryInvocationDetail={summaryInvocationDetail}
      />
    );

    expect(screen.getByRole("heading", { name: "PM Operating Quality" })).toBeInTheDocument();
    const sourceEvidence = screen.getByTestId("pm-operating-quality-source-evidence");
    expect(sourceEvidence).toHaveAttribute("data-panel-state", "partial");
    expect(sourceEvidence).toHaveAttribute("data-attention-state", "clear");
    expect(sourceEvidence).toHaveAttribute("data-supportability-state", "PENDING_REVIEW");
    expect(sourceEvidence).toHaveAttribute("data-source-service", "lotus-manage");
    expect(sourceEvidence).toHaveAttribute(
      "data-authority",
      "lotus-manage:RFC-0042/PM_OPERATING_QUALITY"
    );
    expect(sourceEvidence).toHaveAttribute("data-score-run-id", "pmq_run_001");
    expect(sourceEvidence).toHaveAttribute("data-score-run-state", "READY");
    expect(sourceEvidence).toHaveAttribute("data-fairness-analysis-id", "N/A");
    expect(
      screen.getByText("PM operating quality evidence is partial"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pending review").length).toBeGreaterThan(0);
    expect(screen.getByText("Score-Run Evidence")).toBeInTheDocument();
    expect(screen.getByText("Governance Posture")).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality operation evidence")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality command readiness")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality support summary status")
    ).toBeInTheDocument();
    expect(screen.getByText("Score Preview Command")).toBeInTheDocument();
    expect(screen.getByText("Summary Request")).toBeInTheDocument();
    expect(screen.getByText("Fairness Preview Command")).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality fairness analysis status")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality supervisory review action status")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality score-run selection")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality review-action selection")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality summary generation status")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality summary invocations")
    ).toBeInTheDocument();
    expect(screen.getByText("Awaiting persisted analysis detail or preview")).toBeInTheDocument();
    expect(screen.getByText(/no browser prompt, scoring, ranking, trade approval/i)).toBeInTheDocument();
    expect(screen.getByText("Summary invocation detail load")).toBeInTheDocument();
    expect(screen.getByText("corr-pmq-summary-invocation-detail")).toBeInTheDocument();
    expect(
      screen.getAllByText("Ready for policy pmq_sg_dpm / 2026.05").length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Ready: 2 source-defined segments from Manage").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Source Segments")).toBeInTheDocument();
    expect(screen.getAllByText("Source Refs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("As Of").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-05-13").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Forbidden Uses").length).toBeGreaterThan(0);
    expect(screen.getByText(/no browser prompt, scoring, ranking, trade approval/i)).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality source segments")).toBeInTheDocument();
    expect(
      screen.getByText("System: lotus-core | Product: MandateTypeSegment | ID: balanced")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Mandate type").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Persist Fairness" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Request Support Summary" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Preview Review Action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Review Action" })).toBeDisabled();
    expect(screen.queryByLabelText("Target id")).not.toBeInTheDocument();
    expect(screen.getByText("Selected Record")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /PM_SG_001.*PM_BOOK_SG_BALANCED/i })
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByLabelText("PM operating quality summary-invocation control")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("PM operating quality summary-invocation readiness")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Summary Invocation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeDisabled();
    expect(screen.queryByLabelText("Score run id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Review action id")).not.toBeInTheDocument();
    expect(
      screen.getByText("pmq_review_001 | Score Run / pmq_run_001 | PENDING_REVIEW")
    ).toBeInTheDocument();
    expect(screen.getByText("Not requested")).toBeInTheDocument();
    expect(screen.getAllByText("PMQ-RA-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PMQ-SUMMARY-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("wf_pmq_summary_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("artifact://pmq-summary/001").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Generated text stored: No; Prompt stored: No; Model response stored: No; Client communication projected: No; Order or OMS projected: No"
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Bounded supervisory review of source-owned PM quality posture.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Client Contact (client_contact), OMS Routing (oms_routing), Trade Execution (trade_execution)")
    ).toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw generated PM summary narrative must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Prompt body must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Model response must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/prompt/i)).not.toBeInTheDocument();
    expect(screen.queryByText("raw rationale from Manage must not render")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
    expect(screen.getByText(/does not rank PMs/i)).toBeInTheDocument();
  });

  it("explains when score-run preview is blocked by missing policy context", () => {
    renderWithQueryClient(
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

    renderWithQueryClient(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview Score Run" }));

    await waitFor(() => {
      expect(previewDpmPmOperatingQualityScoreRun).toHaveBeenCalledWith({
        policyId: "pmq_sg_dpm",
        policyVersion: "2026.05",
      });
    });
    expect(
      screen.getByLabelText("PM operating quality action error status")
    ).toBeInTheDocument();
    expect(screen.getByTestId("pm-operating-quality-source-evidence")).toHaveAttribute(
      "data-panel-state",
      "partial"
    );
    expect(screen.getByTestId("pm-operating-quality-source-evidence")).toHaveAttribute(
      "data-attention-state",
      "required"
    );
    expect(screen.getByText("business blocked")).toBeInTheDocument();
    expect(screen.getByText("409")).toBeInTheDocument();
    expect(screen.getByText("Gateway PM operating quality route")).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch preview DPM PM operating quality score run/)).toBeInTheDocument();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
    expect(getDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
  });

  it("explains when fairness preview is blocked by missing source-defined segments", () => {
    renderWithQueryClient(
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
    expect(screen.getByRole("button", { name: "Persist Fairness" })).toBeDisabled();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("keeps Manage action-register blocks visible before command execution", () => {
    renderWithQueryClient(
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
      screen.getByText("Preview Fairness Analysis (PREVIEW_FAIRNESS_ANALYSIS; lotus-manage)")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Persist Fairness" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview Fairness" }));
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
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

    renderWithQueryClient(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
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
    expect(
      await screen.findByText("Fairness preview returned Manage segment evidence.")
    ).toBeInTheDocument();
    expect(screen.getByText("Fairness analysis preview")).toBeInTheDocument();
    expect(screen.getByText("Fairness analysis returned by Gateway")).toBeInTheDocument();
    expect(screen.getByText("corr-pmq-fairness")).toBeInTheDocument();
    expect(screen.getByText("Fairness Analysis Detail")).toBeInTheDocument();
    expect(screen.getByText("PmOperatingQualityFairnessAnalysis / v1")).toBeInTheDocument();
    expect(screen.getByText("15.00")).toBeInTheDocument();
    expect(screen.getAllByText("31.00").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001")
        .length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/protected class inference/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Fairness review required (PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED)"
      ).length
    ).toBeGreaterThan(0);
  });

  it("persists fairness analysis through Gateway and reads the saved analysis detail", async () => {
    vi.mocked(createDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(
      fairnessAnalysisResponse
    );
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(
      fairnessAnalysisResponse
    );

    renderWithQueryClient(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Persist Fairness" }));

    await waitFor(() => {
      expect(createDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith({
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
    expect(getDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      "pmq_fair_002",
      "client"
    );
    expect(screen.getByText("Persisted fairness analysis returned Manage evidence.")).toBeInTheDocument();
    expect(screen.getAllByText("pmq_fair_002").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("corr-pmq-fairness-create").length).toBeGreaterThan(0);
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("requests a review-required PM quality support summary through Gateway", async () => {
    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue(summaryResponse);

    renderWithQueryClient(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Request Support Summary" }));

    await waitFor(() => {
      expect(requestDpmPmOperatingQualitySummary).toHaveBeenCalledWith({
        scoreRunId: "pmq_run_001",
      });
    });
    const resultHeading = await screen.findByRole("heading", {
      name: "Portfolio-manager quality support summary",
    });
    expect(resultHeading).toHaveFocus();
    expect(screen.getByLabelText("Status Live output • review required")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("REVIEW_REQUIRED")).toBeInTheDocument();
    expect(screen.getAllByText("lotus-manage").length).toBeGreaterThan(0);
    expect(screen.getAllByText("packrun_pmq_1").length).toBeGreaterThan(0);
    expect(screen.getByText("score_run_summary, governance_summary")).toBeInTheDocument();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(previewDpmPmOperatingQualityScoreRun).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
  });

  it("binds support and summary commands to records selected in the supervisory context", async () => {
    const secondScoreRun = {
      score_run_id: "pmq_run_002",
      pm_id: "PM_SG_002",
      book_id: "PM_BOOK_SG_INCOME",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      state: "REVIEW_REQUIRED",
      score: "74.00",
      as_of_date: "2026-05-13",
      content_hash: "sha256:pm-quality-second",
      reason_codes: ["PM_QUALITY_REVIEW_REQUIRED"],
      forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityScoreRun",
          source_id: "pmq_run_002",
        },
      ],
    };
    const secondReviewAction = {
      review_action_id: "pmq_review_002",
      review_action_ref: "PMQ-RA-002",
      target_type: "SCORE_RUN",
      target_id: "pmq_run_002",
      action_type: "REQUEST_EVIDENCE_REMEDIATION",
      action_state: "REVIEW_REQUIRED",
      actor_id: "supervisor_sg_2",
      as_of_date: "2026-05-13",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
      operating_boundaries: ["NO_CLIENT_COMMUNICATION", "NO_TRADE_OR_EXECUTION"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityReviewAction",
          source_id: "pmq_review_002",
        },
      ],
    };
    const multiScoreRuns: DpmPmOperatingQualityGatewayResponse = {
      ...scoreRuns,
      supportability: { ...scoreRuns.supportability, count: 2 },
      data: {
        ...scoreRuns.data,
        score_runs: [
          ...((scoreRuns.data.score_runs as Array<Record<string, unknown>> | undefined) ?? []),
          secondScoreRun,
        ],
      },
    };
    const multiReviewActions: DpmPmOperatingQualityGatewayResponse = {
      ...reviewActions,
      supportability: { ...reviewActions.supportability, count: 2 },
      data: {
        review_actions: [
          ...((reviewActions.data.review_actions as
            | Array<Record<string, unknown>>
            | undefined) ?? []),
          secondReviewAction,
        ],
      },
    };
    const secondReviewActionDetail: DpmPmOperatingQualityGatewayResponse = {
      ...reviewActionDetail,
      supportability: {
        ...reviewActionDetail.supportability,
        review_action_id: "pmq_review_002",
      },
      data: {
        review_action: {
          ...secondReviewAction,
          bounded_review_rationale: "Request source-owned evidence remediation.",
          forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
        },
      },
    };

    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue({
      ...summaryResponse,
      supportability: {
        ...summaryResponse.supportability,
        score_run_id: "pmq_run_002",
      },
      score_run: {
        score_run_id: "pmq_run_002",
        content_hash: "sha256:pm-quality-second",
      },
    });
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(
      secondReviewActionDetail
    );
    vi.mocked(previewDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationDetail
    );

    renderWithQueryClient(
      <PmOperatingQualityPanel
        policies={policies}
        scoreRuns={multiScoreRuns}
        reviewActions={multiReviewActions}
        reviewActionDetail={reviewActionDetail}
      />
    );

    fireEvent.click(screen.getByRole("option", { name: /PM_SG_002.*PM_BOOK_SG_INCOME/i }));
    expect(
      screen.getByRole("option", { name: /PM_SG_002.*PM_BOOK_SG_INCOME/i })
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Request Support Summary" }));
    await waitFor(() => {
      expect(requestDpmPmOperatingQualitySummary).toHaveBeenCalledWith({
        scoreRunId: "pmq_run_002",
      });
    });

    fireEvent.click(screen.getByRole("option", { name: /PMQ-RA-002/i }));
    await waitFor(() => {
      expect(getDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith(
        "pmq_review_002",
        "client"
      );
    });
    expect(screen.getByRole("option", { name: /PMQ-RA-002/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview Summary Invocation" }));
    await waitFor(() => {
      expect(previewDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith({
        request: expect.objectContaining({
          score_run_id: "pmq_run_002",
          review_action_id: "pmq_review_002",
          summary_ref: "PMQ-SUMMARY-pmq_run_002",
        }),
        actorId: "workbench-pm-operating-quality-supervisor",
        correlationId: "corr-workbench-pm-quality-summary-invocation-panel-test",
      });
    });
  });

  it("previews and records summary invocations through Gateway after review evidence", async () => {
    vi.mocked(previewDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationDetail
    );
    vi.mocked(createDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationDetail
    );
    vi.mocked(getDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationDetail
    );

    renderWithQueryClient(
      <PmOperatingQualityPanel
        policies={policies}
        scoreRuns={scoreRuns}
        reviewActions={reviewActions}
        reviewActionDetail={reviewActionDetail}
      />
    );

    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview Summary Invocation" }));

    await waitFor(() => {
      expect(previewDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith({
        request: expect.objectContaining({
          score_run_id: "pmq_run_001",
          review_action_id: "pmq_review_001",
          invocation_state: "PENDING_REVIEW",
          summary_ref: "PMQ-SUMMARY-pmq_run_001",
          workflow_pack_name: "pm-operating-quality-summary",
          workflow_pack_version: "2026.05",
          requested_by: "workbench-pm-operating-quality-supervisor",
          source_refs: [],
        }),
        actorId: "workbench-pm-operating-quality-supervisor",
        correlationId: "corr-workbench-pm-quality-summary-invocation-panel-test",
      });
    });
    expect(screen.getByText("Summary-invocation preview returned Manage evidence.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Record Summary Invocation" }));

    await waitFor(() => {
      expect(createDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith({
        request: expect.objectContaining({
          score_run_id: "pmq_run_001",
          review_action_id: "pmq_review_001",
          summary_ref: "PMQ-SUMMARY-pmq_run_001",
        }),
        actorId: "workbench-pm-operating-quality-supervisor",
        correlationId: "corr-workbench-pm-quality-summary-invocation-panel-test",
      });
    });
    await waitFor(() => {
      expect(getDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith(
        "pmq_summary_001",
        "client"
      );
    });
    expect(
      await screen.findByText("Recorded Manage-owned PM quality summary invocation.")
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText("PM operating quality persisted summary-invocation evidence")
    ).toBeInTheDocument();
    expect(screen.getAllByText("pmq_summary_001").length).toBeGreaterThan(0);
    expect(screen.queryByText("Raw generated PM summary narrative must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Prompt body must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Model response must stay hidden.")).not.toBeInTheDocument();
    expect(requestDpmPmOperatingQualitySummary).not.toHaveBeenCalled();
  });
});
