import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import OutcomeReviewPanel from "../../src/features/workbench/components/outcome-review-panel";
import type { DpmOutcomeReviewGatewayResponse } from "../../src/features/workbench/types";
import {
  getDpmOutcomeReviewReportInput,
  requestDpmOutcomeReviewAiNarrative,
  submitDpmOutcomeReviewReportJob,
} from "../../src/features/workbench/api";

vi.mock("../../src/features/workbench/api", () => ({
  getDpmOutcomeReviewReportInput: vi.fn(),
  requestDpmOutcomeReviewAiNarrative: vi.fn(),
  submitDpmOutcomeReviewReportJob: vi.fn(),
}));

const readyResponse: DpmOutcomeReviewGatewayResponse = {
  correlation_id: "corr-rfc42",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042",
    state: "SUPPORTED",
    reason_codes: ["READY_FOR_REPORT_INPUT"],
    blocked_actions: [],
    remediation_owner: null,
  },
  data: {
    items: [
      {
        outcome_review_id: "or_1",
        state: "READY",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        rebalance_run_id: "rr_1",
        proof_pack_id: "ppack_1",
        expected_snapshot_hash: "sha256:expected",
        realized_snapshot_hash: "sha256:realized",
        dimension_results: [
          {
            dimension: "tracking_error",
            expected: { value: 0.012, unit: "ratio" },
            realized: { value: 0.011, unit: "ratio" },
            variance: { value: -0.001, unit: "ratio" },
            state: "WITHIN_TOLERANCE",
          },
        ],
        source_lineage: [
          {
            source_service: "lotus-risk",
            source_ref: "risk_1",
            freshness_bucket: "fresh",
            hash: "sha256:risk",
          },
        ],
      },
    ],
  },
};

describe("OutcomeReviewPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders outcome review state and evidence posture", () => {
    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);

    expect(screen.getByRole("heading", { name: "Outcome Reviews" })).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
    expect(screen.getByText("or_1")).toBeInTheDocument();
    expect(screen.queryByText("rr_1")).not.toBeInTheDocument();
    expect(screen.getByText("Tracking Error")).toBeInTheDocument();
    expect(screen.queryByText("sha256:risk")).not.toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Request report" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Request AI review" })).toBeEnabled();
  });

  it("requests an outcome-review report job from available report input", async () => {
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue({
      ...readyResponse,
      data: { outcome_review_id: "or_1", content_hash: "sha256:report-input" },
    });
    vi.mocked(submitDpmOutcomeReviewReportJob).mockResolvedValue({
      report_request_id: "rrq_outcome_1",
      report_job_id: "rjob_outcome_1",
      status: "accepted",
      status_url: "/api/v1/report-jobs/rjob_outcome_1",
      idempotency_key: "outcome-review-or_1-pdf",
    });

    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);
    fireEvent.click(screen.getByRole("button", { name: "Request report" }));

    await waitFor(() => {
      expect(getDpmOutcomeReviewReportInput).toHaveBeenCalledWith("or_1");
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledWith({
        outcomeReviewId: "or_1",
        outcomeReportInput: { outcome_review_id: "or_1", content_hash: "sha256:report-input" },
      });
    });
    expect(screen.getByText("Report request Accepted.")).toBeInTheDocument();
  });

  it("requests an outcome-review narrative", async () => {
    vi.mocked(requestDpmOutcomeReviewAiNarrative).mockResolvedValue({
      correlation_id: "corr-ai",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: readyResponse.supportability,
      ai_evidence_input: {
        outcome_review_id: "or_1",
        content_hash: "sha256:ai-evidence",
      },
      narrative_request: {
        requested_outputs: ["pm_summary", "cio_summary", "control_summary", "evidence_gaps"],
        audience: ["portfolio_manager", "cio_office", "investment_control"],
      },
      data: {
        execution: { status: "COMPLETED" },
        workflow_pack_run: { run_id: "packrun_or_1", workflow_authority_owner: "lotus-manage" },
      },
    });

    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);
    fireEvent.click(screen.getByRole("button", { name: "Request AI review" }));

    await waitFor(() => {
      expect(requestDpmOutcomeReviewAiNarrative).toHaveBeenCalledWith({
        outcomeReviewId: "or_1",
      });
    });
    expect(screen.getByText("Review request Completed.")).toBeInTheDocument();
  });

  it("keeps report and AI handoff run posture visible after both actions", async () => {
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue({
      ...readyResponse,
      data: { outcome_review_id: "or_1", content_hash: "sha256:report-input" },
    });
    vi.mocked(submitDpmOutcomeReviewReportJob).mockResolvedValue({
      report_request_id: "rrq_outcome_1",
      report_job_id: "rjob_outcome_1",
      status: "accepted",
      status_url: "/api/v1/report-jobs/rjob_outcome_1",
      idempotency_key: "outcome-review-or_1-pdf",
    });
    vi.mocked(requestDpmOutcomeReviewAiNarrative).mockResolvedValue({
      correlation_id: "corr-ai",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: readyResponse.supportability,
      ai_evidence_input: { outcome_review_id: "or_1" },
      narrative_request: {
        requested_outputs: ["pm_summary", "cio_summary", "control_summary", "evidence_gaps"],
        audience: ["portfolio_manager", "cio_office", "investment_control"],
      },
      data: {
        execution: { status: "COMPLETED" },
        workflow_pack_run: { run_id: "packrun_or_1" },
      },
    });

    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);
    fireEvent.click(screen.getByRole("button", { name: "Request report" }));
    fireEvent.click(screen.getByRole("button", { name: "Request AI review" }));

    expect(await screen.findByText("Report request Accepted.")).toBeInTheDocument();
    expect(screen.getByText("Review request Completed.")).toBeInTheDocument();
  });

  it("renders blocked handoff posture from supportability", () => {
    render(
      <OutcomeReviewPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        response={{
          ...readyResponse,
          supportability: {
            ...readyResponse.supportability,
            state: "BLOCKED",
            blocked_actions: ["CREATE_REPORT_INPUT", "REQUEST_AI_NARRATIVE"],
            remediation_owner: "Portfolio Operations",
          },
        }}
      />
    );

    expect(screen.getByText("Outcome review handoff is blocked")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Portfolio Operations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request AI review" })).toBeDisabled();
  });

  it("renders unavailable state without claiming support", () => {
    render(
      <OutcomeReviewPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        response={null}
        errorMessage="Failed to fetch DPM outcome reviews (503)"
      />
    );

    expect(screen.getByText("Outcome review is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM outcome reviews (503)")).toBeInTheDocument();
  });
});
