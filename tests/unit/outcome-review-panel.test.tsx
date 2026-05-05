import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import OutcomeReviewPanel from "../../src/features/workbench/components/outcome-review-panel";
import type { DpmOutcomeReviewGatewayResponse } from "../../src/features/workbench/types";
import {
  getDpmOutcomeReviewReportInput,
  submitDpmOutcomeReviewReportJob,
} from "../../src/features/workbench/api";

vi.mock("../../src/features/workbench/api", () => ({
  getDpmOutcomeReviewReportInput: vi.fn(),
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

  it("renders manage-backed outcome review state and evidence posture", () => {
    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);

    expect(screen.getByRole("heading", { name: "Post-Trade Outcome Review" })).toBeInTheDocument();
    expect(screen.getByText("SUPPORTED")).toBeInTheDocument();
    expect(screen.getByText("or_1")).toBeInTheDocument();
    expect(screen.getByText("rr_1")).toBeInTheDocument();
    expect(screen.getByText("tracking_error")).toBeInTheDocument();
    expect(screen.getByText("sha256:risk")).toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBe(2);
    expect(screen.getByRole("button", { name: "Request report" })).toBeEnabled();
  });

  it("requests a governed outcome-review report job from manage report input", async () => {
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
    expect(screen.getByText("accepted / rjob_outcome_1")).toBeInTheDocument();
  });

  it("renders blocked handoff posture from Gateway supportability", () => {
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
    expect(screen.getAllByText("Blocked").length).toBe(2);
    expect(screen.getByText("Portfolio Operations")).toBeInTheDocument();
  });

  it("renders unavailable state without claiming support", () => {
    render(
      <OutcomeReviewPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        response={null}
        errorMessage="Failed to fetch DPM outcome reviews (503)"
      />
    );

    expect(screen.getByText("Outcome review endpoint is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM outcome reviews (503)")).toBeInTheDocument();
  });
});
