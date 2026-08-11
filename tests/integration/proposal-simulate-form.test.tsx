import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalSimulateForm from "../../src/features/proposals/components/proposal-simulate-form";
import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "../../src/features/proposals/components/proposal-workflow-context";
import { buildSimulationProposalWorkflowContext } from "../../src/features/proposals/proposal-workflow-context-view-model";

const advisoryApiMocks = vi.hoisted(() => ({
  applyAdvisoryWorkspaceDraftAction: vi.fn(),
  createAdvisoryWorkspace: vi.fn(),
  evaluateAdvisoryWorkspace: vi.fn(),
  handoffAdvisoryWorkspace: vi.fn(),
}));

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioBook: vi.fn(async () => ({
    positions: [
      {
        security_id: "AAPL",
        instrument_name: "Apple Inc.",
        asset_class: "Equities",
        quantity: 100,
        market_price: 190,
        market_value_base: 19000,
        weight_pct: 19,
      },
    ],
    top_positions: [],
    allocation_views: [],
  })),
  getPortfolioWorkspaceShell: vi.fn(async () => ({
    summary: {
      total_cash_base: 25000,
    },
  })),
}));

vi.mock("../../src/features/proposals/api", () => advisoryApiMocks);

function workspaceEnvelope(
  workspaceId = "aws_test_001",
  latestProposalResult: unknown = {
    status: "READY",
    proposal_run_id: "run-test",
  }
) {
  return {
    correlation_id: "corr-test",
    contract_version: "v1",
    data: {
      workspace: {
        workspace_id: workspaceId,
        evaluation_summary: {
          status: "READY",
          blocking_issue_count: 0,
          review_issue_count: 1,
          impact_summary: {
            portfolio_value_delta_base_ccy: "1900.00",
            trade_count: 1,
            cash_flow_count: 0,
          },
        },
        latest_proposal_result: latestProposalResult,
      },
    },
  };
}

function workspaceEnvelopeWithoutEvaluationResult(workspaceId = "aws_test_001") {
  const response = workspaceEnvelope(workspaceId);
  const { latest_proposal_result: _latestProposalResult, ...workspace } = response.data.workspace;
  return {
    ...response,
    data: { workspace },
  };
}

function renderForm(initialPortfolioId?: string) {
  const queryClient = new QueryClient();
  const portfolioId = initialPortfolioId ?? "PB_SG_GLOBAL_BAL_001";
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalWorkflowContextProvider
        initialModel={buildSimulationProposalWorkflowContext({ portfolioId })}
      >
        <ProposalSimulateForm initialPortfolioId={initialPortfolioId} />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    </QueryClientProvider>
  );
}

describe("ProposalSimulateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    advisoryApiMocks.createAdvisoryWorkspace.mockResolvedValue(workspaceEnvelope());
    advisoryApiMocks.applyAdvisoryWorkspaceDraftAction.mockResolvedValue(workspaceEnvelope());
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockResolvedValue(workspaceEnvelope());
    advisoryApiMocks.handoffAdvisoryWorkspace.mockResolvedValue({
      correlation_id: "corr-handoff",
      contract_version: "v1",
      data: {
        proposal: {
          proposal: {
            proposal_id: "pp_test_001",
          },
        },
      },
    });
  });

  it("renders proposal simulation form", () => {
    renderForm();
    expect(screen.getByText("Create Advisory Proposal")).toBeInTheDocument();
    expect(screen.getByText("Evaluate Workspace")).toBeInTheDocument();
    expect(screen.getByText("Current Positions")).toBeInTheDocument();
    expect(screen.getByText("Draft Order Blotter")).toBeInTheDocument();
    expect(screen.getByText("Indicative Draft Impact")).toBeInTheDocument();
    expect(screen.queryByLabelText("Idempotency Key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Created By")).not.toBeInTheDocument();
  });

  it("uses provided initial portfolio id", () => {
    renderForm("PORT_UI_1001");
    const portfolioInput = screen.getByLabelText("Portfolio ID") as HTMLInputElement;
    expect(portfolioInput.value).toBe("PORT_UI_1001");
  });

  it("moves the workflow rail from construction to the source-retained draft", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    expect(
      screen.getByRole("heading", { name: "Draft not yet persisted" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(
      await screen.findByRole("heading", { name: "Advisor draft saved" })
    ).toBeInTheDocument();
    expect(screen.getByText("Draft retained for review")).toBeInTheDocument();
    expect(screen.getAllByText("pp_test_001").length).toBeGreaterThan(0);
    expect(screen.queryByText("Draft not yet persisted")).not.toBeInTheDocument();
  });

  it("retains construction-only posture when draft persistence fails", async () => {
    advisoryApiMocks.handoffAdvisoryWorkspace.mockRejectedValueOnce(
      new Error("advisory service unavailable")
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(await screen.findByText("advisory service unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Draft not yet persisted" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Draft retained for review")).not.toBeInTheDocument();
  });

  it("does not claim persistence when the advisory response has no proposal identity", async () => {
    advisoryApiMocks.handoffAdvisoryWorkspace.mockResolvedValueOnce({
      correlation_id: "corr-handoff-missing-id",
      contract_version: "v1",
      data: { proposal: {} },
    });
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(
      await screen.findByText(
        "The advisory service retained no proposal identity for this draft."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Draft not yet persisted" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Draft retained for review")).not.toBeInTheDocument();
  });

  it("adds a held position into the interactive draft order blotter", async () => {
    renderForm("PORT_UI_1001");

    expect(await screen.findByText("Apple Inc.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buy More" }));

    const instrumentInputs = screen.getAllByLabelText("Instrument") as HTMLInputElement[];
    expect(instrumentInputs.some((input) => input.value === "AAPL")).toBe(true);
  });

  it("creates a stateful Advise workspace and applies draft trades without sending positions", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    expect(await screen.findByText("Apple Inc.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buy More" }));

    const quantityInputs = screen.getAllByLabelText("Quantity") as HTMLInputElement[];
    fireEvent.change(quantityInputs[quantityInputs.length - 1], { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    await waitFor(() => expect(advisoryApiMocks.createAdvisoryWorkspace).toHaveBeenCalled());
    expect(advisoryApiMocks.createAdvisoryWorkspace).toHaveBeenCalledWith({
      body: expect.objectContaining({
        input_mode: "stateful",
        stateful_input: expect.objectContaining({
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          as_of: "2026-04-10",
        }),
      }),
    });
    expect(advisoryApiMocks.createAdvisoryWorkspace.mock.calls[0][0].body).not.toHaveProperty(
      "stateless_input"
    );
    await waitFor(() =>
      expect(advisoryApiMocks.applyAdvisoryWorkspaceDraftAction).toHaveBeenCalledWith(
        "aws_test_001",
        {
          body: expect.objectContaining({
            action_type: "ADD_TRADE",
            trade: expect.objectContaining({
              intent_type: "SECURITY_TRADE",
              side: "BUY",
              instrument_id: "AAPL",
              quantity: "10.0000",
            }),
          }),
        }
      )
    );
    await waitFor(() =>
      expect(advisoryApiMocks.evaluateAdvisoryWorkspace).toHaveBeenCalledWith("aws_test_001")
    );
    const evaluationSummary = await screen.findByRole("status", {
      name: "Proposal evaluation summary",
    });
    expect(evaluationSummary).toHaveTextContent("Advise Evaluation Summary");
    expect(screen.getByText("Workspace aws_test_001 evaluated by Advise")).toBeInTheDocument();
  });

  it("keeps evaluation failure explicit without claiming the workspace was evaluated", async () => {
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockRejectedValueOnce(
      new Error("proposal evaluation unavailable")
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    expect(await screen.findByText("proposal evaluation unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/evaluated by Advise/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Proposal evaluation summary" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["missing result", workspaceEnvelopeWithoutEvaluationResult()],
    ["null result", workspaceEnvelope("aws_test_001", null)],
    ["empty result", workspaceEnvelope("aws_test_001", {})],
    [
      "malformed result",
      workspaceEnvelope("aws_test_001", { status: "READY", proposal_run_id: 17 }),
    ],
  ])("rejects a 2xx evaluation envelope with %s", async (_name, evaluationResponse) => {
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockResolvedValueOnce(evaluationResponse);
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    expect(
      await screen.findByText(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/evaluated by Advise/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Proposal evaluation summary" })
    ).not.toBeInTheDocument();
  });

  it("recovers from incomplete evaluation evidence after an intentional retry", async () => {
    advisoryApiMocks.evaluateAdvisoryWorkspace
      .mockResolvedValueOnce(workspaceEnvelope("aws_test_001", null))
      .mockResolvedValueOnce(workspaceEnvelope());
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    expect(
      await screen.findByText(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    expect(
      await screen.findByRole("status", { name: "Proposal evaluation summary" })
    ).toHaveTextContent("run-test");
    expect(screen.getByText("Workspace aws_test_001 evaluated by Advise")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      )
    ).not.toBeInTheDocument();
  });

  it("removes stale evaluation evidence when draft handoff re-evaluation is incomplete", async () => {
    advisoryApiMocks.evaluateAdvisoryWorkspace
      .mockResolvedValueOnce(workspaceEnvelope())
      .mockResolvedValueOnce(workspaceEnvelope("aws_test_002", null));
    renderForm("PB_SG_GLOBAL_BAL_001");

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    expect(
      await screen.findByRole("status", { name: "Proposal evaluation summary" })
    ).toHaveTextContent("run-test");

    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(
      await screen.findByText(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/evaluated by Advise/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Proposal evaluation summary" })
    ).not.toBeInTheDocument();
    expect(advisoryApiMocks.handoffAdvisoryWorkspace).not.toHaveBeenCalled();
  });

  it("caps submitted sell-down quantities to source-backed available units", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    expect(await screen.findByText("Apple Inc.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sell Down" }));

    const quantityInputs = screen.getAllByLabelText("Quantity") as HTMLInputElement[];
    fireEvent.change(quantityInputs[quantityInputs.length - 1], { target: { value: "150" } });
    expect(
      screen.getByText("1 sell line capped to source-backed available units")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    await waitFor(() =>
      expect(advisoryApiMocks.applyAdvisoryWorkspaceDraftAction).toHaveBeenCalledWith(
        "aws_test_001",
        {
          body: expect.objectContaining({
            action_type: "ADD_TRADE",
            trade: expect.objectContaining({
              intent_type: "SECURITY_TRADE",
              side: "SELL",
              instrument_id: "AAPL",
              quantity: "100.0000",
            }),
          }),
        }
      )
    );
  });
});
