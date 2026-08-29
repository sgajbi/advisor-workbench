import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import OutcomeReviewPanel from "../../src/features/workbench/components/outcome-review-panel";
import type { DpmOutcomeReviewGatewayResponse } from "../../src/features/workbench/types";
import {
  getDpmOutcomeReviewReportInput,
  requestDpmOutcomeReviewAiNarrative,
  submitDpmOutcomeReviewReportJob,
} from "../../src/features/workbench/outcome-review-api";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

vi.mock("../../src/features/workbench/outcome-review-api", () => ({
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
    applied_filters: {
      source_system: "lotus-performance",
      source_type: "PortfolioRealizedTaxSummary:v1",
    },
    source_owner_counts: { "lotus-performance": 2 },
    source_type_counts: { "PortfolioRealizedTaxSummary:v1": 2 },
    support_boundary: {
      manage_persisted_lineage_only: true,
      source_owner_store_query: false,
      global_portfolio_discovery: false,
    },
  },
  data: {
    items: [
      {
        outcome_review_id: "or_1",
        state: "READY",
        overall_outcome: "READY_WITHIN_TOLERANCE",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        rebalance_run_id: "rr_1",
        proof_pack_id: "ppack_1",
        expected_snapshot: {
          source_hashes: { expected: "sha256:expected" },
        },
        realized_snapshot: {
          source_hashes: { realized: "sha256:realized" },
        },
        created_at: "2026-05-13T09:35:00Z",
        review_window: { start: "2026-05-01", end: "2026-05-13" },
        variance_summary: { drift_improvement_pct: 72.4 },
        supportability: {
          explanation: "Outcome remains within mandate tolerance for advisor handoff.",
        },
        client_communication_boundary: clientCommunicationBoundary(),
        dimension_results: [
          {
            dimension: "DRIFT_REDUCTION",
            expected: { value: 0.012, unit: "ratio" },
            realized: { value: 0.011, unit: "ratio" },
            variance: { value: -0.001, unit: "ratio" },
            state: "READY",
            explanation: "Drift reduction achieved within tolerance.",
          },
        ],
        source_lineage: [
          {
            source_service: "lotus-risk",
            source_type: "PortfolioRiskSummary:v1",
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

    expect(screen.getByRole("heading", { name: "Outcome comparison" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compare expected and realised outcomes, review mandate impact, and confirm evidence readiness.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Supported")).not.toBeInTheDocument();
    expect(screen.getByText("Review timeline")).toBeInTheDocument();
    expect(screen.getByText("Recommended actions")).toBeInTheDocument();
    expect(screen.getByText("Recorded evidence profile")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View source profile"));
    expect(screen.getByText("Portfolio realised tax summary")).toBeInTheDocument();
    expect(screen.getByText("Source owner store query: No")).toBeInTheDocument();
    expect(screen.getByText("Selected review detail")).toBeInTheDocument();
    expect(screen.getByTestId("selected-outcome-review-detail")).toHaveAttribute(
      "data-outcome-review-id",
      "or_1",
    );
    expect(screen.getByTestId("selected-outcome-review-detail")).toHaveAttribute(
      "data-expected-snapshot-hash",
      "sha256:expected",
    );
    expect(screen.getByTestId("selected-outcome-review-detail")).toHaveAttribute(
      "data-realized-snapshot-hash",
      "sha256:realized",
    );
    expect(screen.getByText("Ready for adviser review")).toBeInTheDocument();
    expect(screen.getAllByText("Within expected tolerance").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected outcome review readiness")).toHaveTextContent(
      "Report preparationReady"
    );
    expect(screen.getByLabelText("Selected outcome review readiness")).toHaveTextContent(
      "AI-assisted review summaryReady"
    );
    expect(screen.getByLabelText("Selected outcome review readiness")).toHaveTextContent(
      "Source evidenceAvailable"
    );
    expect(screen.queryByText("or_1")).not.toBeInTheDocument();
    expect(screen.queryByText("rr_1")).not.toBeInTheDocument();
    expect(screen.getByText("Drift reduction")).toBeInTheDocument();
    expect(screen.queryByText("sha256:risk")).not.toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Review mandate impact/ })).toHaveAttribute(
      "href",
      "#outcome-review-detail"
    );
    expect(screen.getByRole("link", { name: /Open evidence pack/ })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=proof"
    );
    expect(screen.queryByText("Record advisor note")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Client communication boundary")).toHaveTextContent(
      "Not projected"
    );
    expect(screen.getByText("Client communication record")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View blocked client actions"));
    expect(screen.getByText("Client message generation")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request report" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Prepare AI-assisted review summary/ }),
    ).toBeEnabled();
  });

  it("requests an outcome-review report job from available report input", async () => {
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue({
      ...readyResponse,
      data: {
        outcome_review_id: "or_1",
        content_hash: "sha256:report-input",
        client_communication_boundary: {
          ...clientCommunicationBoundary(),
          content_hash: "sha256:report-boundary",
        },
      },
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
        outcomeReportInput: {
          outcome_review_id: "or_1",
          content_hash: "sha256:report-input",
          client_communication_boundary: {
            ...clientCommunicationBoundary(),
            content_hash: "sha256:report-boundary",
          },
        },
      });
    });
    expect(screen.getByText("Report request Accepted.")).toBeInTheDocument();
    expect(screen.getByLabelText("Client communication boundary")).toHaveTextContent(
      "Client communication record"
    );
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
        client_communication_boundary: {
          ...clientCommunicationBoundary(),
          content_hash: "sha256:ai-boundary",
        },
      },
      narrative_request: {
        requested_outputs: ["pm_summary", "cio_summary", "control_summary", "evidence_gaps"],
        audience: ["portfolio_manager", "cio_office", "investment_control"],
      },
      data: buildDpmAiWorkflowExecution("outcome-narrative", { runId: "packrun_or_1" }),
    });

    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);
    const requestSummary = screen.getByRole("button", {
      name: /Prepare AI-assisted review summary/,
    });
    requestSummary.focus();
    expect(requestSummary).toHaveFocus();
    fireEvent.click(requestSummary);

    await waitFor(() => {
      expect(requestDpmOutcomeReviewAiNarrative).toHaveBeenCalledWith({
        outcomeReviewId: "or_1",
      });
    });
    const resultHeading = await screen.findByRole("heading", {
      name: "Outcome review narrative",
    });
    expect(resultHeading).toHaveFocus();
    expect(screen.getByLabelText("Status Live output • review required")).toBeInTheDocument();
    expect(screen.getByLabelText("Client communication boundary")).toHaveTextContent(
      "Delivery confirmation"
    );
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
      data: buildDpmAiWorkflowExecution("outcome-narrative", { runId: "packrun_or_1" }),
    });

    render(<OutcomeReviewPanel portfolioId="PB_SG_GLOBAL_BAL_001" response={readyResponse} />);
    fireEvent.click(screen.getByRole("button", { name: "Request report" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare AI-assisted review summary/ }),
    );

    expect(await screen.findByText("Report request Accepted.")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Outcome review narrative" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status Live output • review required")).toBeInTheDocument();
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
    expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Portfolio Operations/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Prepare AI-assisted review summary/ }),
    ).toBeDisabled();
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

function clientCommunicationBoundary(): Record<string, unknown> {
  return {
    boundary_id: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
    supportability_state: "BLOCKED",
    source_system: "lotus-manage",
    source_product_name: "DpmPostTradeOutcomeReview",
    source_product_version: "v1",
    client_communication_projected: false,
    client_approval_projected: false,
    reason_code: "OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED",
    blocked_capabilities: [
      "client_approval",
      "client_contact",
      "client_message_generation",
      "communication_audit",
      "delivery_confirmation",
    ],
    required_owner: "future client-communication owner",
    required_source_product: "ClientCommunicationRecord:v1",
    summary: "Manage does not publish client communication events for this outcome review.",
    content_hash: "sha256:client-communication-boundary",
  };
}
