import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalSimulateForm from "../../src/features/proposals/components/proposal-simulate-form";

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

function workspaceEnvelope(workspaceId = "aws_test_001") {
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
        latest_proposal_result: {
          status: "READY",
          proposal_run_id: "run-test",
        },
      },
    },
  };
}

function renderForm(initialPortfolioId?: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalSimulateForm initialPortfolioId={initialPortfolioId} />
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
    expect(await screen.findByText("Advise Evaluation Summary")).toBeInTheDocument();
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
