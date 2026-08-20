import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DpmCommandCenterPanel from "../../src/features/workbench/components/dpm-command-center-panel";
import {
  requestDpmExceptionSummary,
  runDpmCommandCenterMonitoring,
} from "../../src/features/workbench/dpm-command-center-api";
import type {
  DpmCommandCenterGatewayResponse,
  DpmExceptionSummaryResponse,
} from "../../src/features/workbench/types";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

vi.mock("../../src/features/workbench/dpm-command-center-api", () => ({
  requestDpmExceptionSummary: vi.fn(),
  runDpmCommandCenterMonitoring: vi.fn(),
}));

const readyResponse: DpmCommandCenterGatewayResponse = {
  correlation_id: "corr-rfc38",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0038",
    state: "COMPLETE",
    data_completeness_state: "COMPLETE",
    partial_readiness_reasons: [],
    source_run_id: "dmr_1",
    remediation_owner: "Portfolio Operations",
  },
  data: {
    health_distribution: { READY: 3, PENDING_REVIEW: 1 },
    source_readiness_summary: { READY: 4 },
    evaluated_mandates: 4,
    active_exception_count: 1,
    latest_monitoring_run: {
      monitoring_run_id: "dmr_1",
      status: "SUCCEEDED",
    },
    attention_buckets: [
      {
        dimension: "SOURCE_READINESS",
        severity: "HIGH",
        reason_code: "TAX_LOT_SOURCE_PARTIAL",
        recommended_action: "REPAIR_SOURCE_DATA",
        count: 1,
      },
    ],
    recommended_actions: [
      {
        recommended_action: "SIMULATE_REBALANCE",
        severity: "MEDIUM",
        count: 3,
      },
    ],
  },
};

function buildExceptionSummaryResponse(
  exceptionId: string,
): DpmExceptionSummaryResponse {
  return {
    correlation_id: `corr-exception-summary-${exceptionId}`,
    contract_version: "v1",
    source_service: "lotus-ai",
    evidence_source_service: "lotus-manage",
    manage_upstream_status: 200,
    ai_upstream_status: 200,
    supportability: {
      ...readyResponse.supportability,
      state: "READY",
      data_completeness_state: "READY",
    },
    exception_summary_input: {
      exception_id: exceptionId,
      source_refs: [`lotus-manage:monitoring-exception:${exceptionId}`],
    },
    exception_summary_request: {
      requested_outputs: ["exception_summary", "recommended_triage"],
      audience: ["portfolio_manager", "operations"],
    },
    data: buildDpmAiWorkflowExecution("exception-summary", {
      runId: `wf_run_exception_summary_${exceptionId}`,
    }),
  };
}

function exceptionProjection(exceptionId: string): DpmCommandCenterGatewayResponse {
  return {
    ...readyResponse,
    data: {
      items: [
        {
          exception_id: exceptionId,
          mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
          severity: "HIGH",
          reason_code: "TAX_LOT_SOURCE_PARTIAL",
          recommended_action: "REPAIR_SOURCE_DATA",
          state: "ACTIVE",
        },
      ],
    },
  };
}

describe("DpmCommandCenterPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Gateway-backed command-center cockpit panels", () => {
    render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={{
          ...readyResponse,
          data: {
            items: [
              {
                exception_id: "me_1",
                mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
                severity: "HIGH",
                reason_code: "TAX_LOT_SOURCE_PARTIAL",
                recommended_action: "REPAIR_SOURCE_DATA",
                state: "ACTIVE",
              },
            ],
          },
        }}
        mandate={{
          ...readyResponse,
          data: { mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001" },
        }}
        mandateHealth={{
          ...readyResponse,
          data: {
            mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
            health_score: 97,
            health_state: "PENDING_REVIEW",
            recommended_action: "SIMULATE_REBALANCE",
            dimension_scores: [
              {
                dimension: "SOURCE_READINESS",
                score: 90,
                state: "PENDING_REVIEW",
                reason_codes: ["TAX_LOT_SOURCE_PARTIAL"],
              },
            ],
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Mandate Health" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Complete").length).toBeGreaterThan(0);
    expect(screen.getByText("Book Health Strip")).toBeInTheDocument();
    expect(screen.getByText("Data Readiness")).toBeInTheDocument();
    expect(screen.getAllByText("REPAIR_SOURCE_DATA").length).toBeGreaterThan(0);
    expect(screen.getByText("SIMULATE_REBALANCE")).toBeInTheDocument();
    expect(screen.getByText("me_1")).toBeInTheDocument();
    expect(screen.getAllByText("SOURCE_READINESS").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Run monitoring" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Exception summary" }),
    ).toBeEnabled();
    expect(screen.getByText("Exception Summary")).toBeInTheDocument();
  });

  it("requests monitoring through Gateway only", async () => {
    vi.mocked(runDpmCommandCenterMonitoring).mockResolvedValue({
      ...readyResponse,
      supportability: {
        ...readyResponse.supportability,
        state: "UNKNOWN",
      },
      data: { monitoring_run_id: "dmr_2", status: "SUCCEEDED" },
    });

    render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        mandate={{
          ...readyResponse,
          data: { mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001" },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run monitoring" }));

    await waitFor(() => {
      expect(runDpmCommandCenterMonitoring).toHaveBeenCalledWith();
    });
    expect(
      await screen.findByText("Monitoring completed with Succeeded."),
    ).toBeInTheDocument();
  });

  it("requests exception summary through Gateway only and preserves workflow-pack posture", async () => {
    vi.mocked(requestDpmExceptionSummary).mockResolvedValue(
      buildExceptionSummaryResponse("me_1"),
    );

    render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={{
          ...readyResponse,
          data: {
            items: [
              {
                exception_id: "me_1",
                mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
                severity: "HIGH",
                reason_code: "TAX_LOT_SOURCE_PARTIAL",
                recommended_action: "REPAIR_SOURCE_DATA",
                state: "ACTIVE",
              },
            ],
          },
        }}
        mandate={{
          ...readyResponse,
          data: { mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001" },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exception summary" }));

    await waitFor(() => {
      expect(requestDpmExceptionSummary).toHaveBeenCalledWith({
        exceptionId: "me_1",
        mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
        state: "ACTIVE",
      });
    });
    const resultHeading = await screen.findByRole("heading", {
      name: "Mandate exception review summary",
    });
    expect(resultHeading).toHaveFocus();
    expect(screen.getByLabelText("Status Live output • review required")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mandate exception review summary is available for internal review and is not approved for client use.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects a summary returned for a different exception", async () => {
    vi.mocked(requestDpmExceptionSummary).mockResolvedValue(
      buildExceptionSummaryResponse("me_2"),
    );

    render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={exceptionProjection("me_1")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exception summary" }));

    expect(
      await screen.findByText(
        "The returned summary did not match the selected exception.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Mandate exception review summary",
      }),
    ).not.toBeInTheDocument();
  });

  it("removes a completed summary when the selected exception changes", async () => {
    vi.mocked(requestDpmExceptionSummary).mockResolvedValue(
      buildExceptionSummaryResponse("me_1"),
    );
    const { rerender } = render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={exceptionProjection("me_1")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exception summary" }));
    await screen.findByRole("heading", {
      name: "Mandate exception review summary",
    });

    rerender(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={exceptionProjection("me_2")}
      />,
    );

    expect(
      screen.queryByRole("heading", {
        name: "Mandate exception review summary",
      }),
    ).not.toBeInTheDocument();
  });

  it("discards an in-flight summary after the selected exception changes", async () => {
    let resolveSummary!: (value: DpmExceptionSummaryResponse) => void;
    vi.mocked(requestDpmExceptionSummary).mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );
    const { rerender } = render(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={exceptionProjection("me_1")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exception summary" }));
    await waitFor(() => expect(requestDpmExceptionSummary).toHaveBeenCalled());
    rerender(
      <DpmCommandCenterPanel
        commandCenter={readyResponse}
        exceptions={exceptionProjection("me_2")}
      />,
    );
    resolveSummary(buildExceptionSummaryResponse("me_1"));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", {
          name: "Mandate exception review summary",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("renders empty command-center state without claiming failure", () => {
    render(
      <DpmCommandCenterPanel
        commandCenter={{
          ...readyResponse,
          supportability: {
            ...readyResponse.supportability,
            state: "EMPTY",
            data_completeness_state: "EMPTY",
            partial_readiness_reasons: [],
          },
          data: { health_distribution: {}, evaluated_mandates: 0 },
        }}
      />,
    );

    expect(
      screen.getByText("No monitoring run for this PM book"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run monitoring" }),
    ).toBeEnabled();
  });

  it("renders gateway errors truthfully", () => {
    render(
      <DpmCommandCenterPanel
        commandCenter={null}
        errorMessage="Failed to fetch DPM command center (503)"
      />,
    );

    expect(
      screen.getByText("Mandate health is unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Failed to fetch DPM command center (503)"),
    ).toBeInTheDocument();
  });
});
