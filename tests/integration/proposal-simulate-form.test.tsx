import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalSimulateForm from "../../src/features/proposals/components/proposal-simulate-form";
import {
  ProposalWorkflowContextBoundary,
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "../../src/features/proposals/components/proposal-workflow-context";
import { buildSimulationProposalWorkflowContext } from "../../src/features/proposals/proposal-workflow-context-view-model";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const advisoryApiMocks = vi.hoisted(() => ({
  applyAdvisoryWorkspaceDraftAction: vi.fn(),
  createAdvisoryWorkspace: vi.fn(),
  evaluateAdvisoryWorkspace: vi.fn(),
  handoffAdvisoryWorkspace: vi.fn(),
}));

const portfolioApiMocks = vi.hoisted(() => ({
  getRequiredPortfolioBook: vi.fn(),
}));

vi.mock("../../src/apps/portfolio/api", () => portfolioApiMocks);

function portfolioBook(
  positions = [
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
  context: {
    portfolioId?: string;
    asOfDate?: string;
    currency?: string | null;
  } = {}
) {
  return {
    as_of_date: context.asOfDate ?? "2026-04-10",
    portfolio: {
      portfolio_id: context.portfolioId ?? "PB_SG_GLOBAL_BAL_001",
      display_name: "Global Balanced Portfolio",
      client_id: "CIF_001",
      base_currency: context.currency === undefined ? "USD" : context.currency,
      booking_center_code: "SGPB",
    },
    summary: {
      assets_under_management_base: 44000,
      invested_market_value_base: 19000,
      cash_market_value_base: 25000,
      cash_weight_pct: 56.8,
      position_count: positions.length,
      cash_balance_count: 1,
    },
    cash_balances: [],
    positions,
    top_positions: [],
    allocation_views: [],
  };
}

function resetPortfolioEvidenceMocks() {
  portfolioApiMocks.getRequiredPortfolioBook.mockImplementation(
    async (
      portfolioId: string,
      params: { asOfDate?: string; reportingCurrency?: string } = {}
    ) =>
      portfolioBook(undefined, {
        portfolioId,
        asOfDate: params.asOfDate,
        currency: params.reportingCurrency,
      })
  );
}

async function waitForPortfolioEvidence(status = "ready") {
  const panel = await screen.findByTestId("proposal-portfolio-evidence");
  await waitFor(() => expect(panel).toHaveAttribute("data-evidence-status", status));
  return panel;
}

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderForm(
  initialPortfolioId = "PB_SG_GLOBAL_BAL_001",
  initialReportingCurrency = "USD",
  sourceContextConfirmed = true,
  initialAsOfDate = "2026-04-10",
) {
  const queryClient = new QueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProposalWorkflowContextProvider
        initialModel={buildSimulationProposalWorkflowContext({
          portfolioId: initialPortfolioId,
        })}
      >
        <ProposalSimulateForm
          initialPortfolioId={initialPortfolioId}
          initialAsOfDate={initialAsOfDate}
          initialReportingCurrency={initialReportingCurrency}
          sourceContextConfirmed={sourceContextConfirmed}
        />
        <ProposalWorkflowContextBoundary presentation="inline" />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    </QueryClientProvider>
  );
  return { ...view, queryClient };
}

describe("ProposalSimulateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPortfolioEvidenceMocks();
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

  it("renders proposal simulation form", async () => {
    renderForm();
    expect(screen.getByText("Create Advisory Proposal")).toBeInTheDocument();
    expect(screen.getByText("Evaluate Workspace")).toBeInTheDocument();
    expect(screen.getByText("Current Positions")).toBeInTheDocument();
    expect(screen.getByText("Draft Order Blotter")).toBeInTheDocument();
    expect(screen.getByText("Indicative Draft Impact")).toBeInTheDocument();
    expect(screen.queryByLabelText("Idempotency Key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Created By")).not.toBeInTheDocument();
    await waitForPortfolioEvidence();
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-currency-status",
      "available"
    );
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-currency",
      "USD"
    );
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
    expect(screen.getByLabelText("Additional Cash Assumption")).toHaveValue("10000");
  });

  it("initializes portfolio evidence and draft rows from governed currency", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce(
      portfolioBook(undefined, { currency: "SGD" }),
    );
    renderForm("PB_SG_GLOBAL_BAL_001", "SGD");

    await waitForPortfolioEvidence();
    expect(screen.queryByLabelText("Portfolio Currency")).not.toBeInTheDocument();
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2026-04-10", reportingCurrency: "SGD" },
    );
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-currency",
      "SGD",
    );
  });

  it("derives missing proposal date and currency from the source-confirmed book", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalWorkflowContextProvider
          initialModel={buildSimulationProposalWorkflowContext({
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          })}
        >
          <ProposalSimulateForm
            initialPortfolioId="PB_SG_GLOBAL_BAL_001"
            sourceContextConfirmed
          />
        </ProposalWorkflowContextProvider>
      </QueryClientProvider>,
    );

    await waitForPortfolioEvidence();

    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenNthCalledWith(
      1,
      "PB_SG_GLOBAL_BAL_001",
      {},
    );
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenLastCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2026-04-10", reportingCurrency: "USD" },
    );
    expect(screen.queryByLabelText("Advisory As-of Date")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio Currency")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Price Currency")).toHaveValue("USD");
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  });

  it("fails closed on an invalid carried advisory date without requesting it from source", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001", "USD", true, "2026-02-31");

    const evidence = await waitForPortfolioEvidence("unavailable");
    expect(evidence).toHaveAttribute(
      "data-evidence-date-issue",
      "invalid_requested_date",
    );
    expect(screen.getByText("Advisory date needs correction")).toBeInTheDocument();
    expect(screen.getByText("2026-02-31")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Return to the portfolio review and select a valid advisory date before evaluating or saving this draft.",
      ),
    ).toBeInTheDocument();
    expect(portfolioApiMocks.getRequiredPortfolioBook).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Refresh Portfolio Evidence" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
  });

  it("fails closed when the portfolio source returns an impossible advisory date", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValue(
      portfolioBook(undefined, { asOfDate: "2026-04-31" }),
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalWorkflowContextProvider
          initialModel={buildSimulationProposalWorkflowContext({
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          })}
        >
          <ProposalSimulateForm
            initialPortfolioId="PB_SG_GLOBAL_BAL_001"
            sourceContextConfirmed
          />
        </ProposalWorkflowContextProvider>
      </QueryClientProvider>,
    );

    const evidence = await waitForPortfolioEvidence("unavailable");
    expect(evidence).toHaveAttribute(
      "data-evidence-date-issue",
      "invalid_source_date",
    );
    expect(screen.getByText("Portfolio evidence date is unavailable")).toBeInTheDocument();
    expect(screen.getByText("2026-04-31")).toBeInTheDocument();
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledTimes(1);
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      {},
    );
    expect(screen.getByLabelText("Currency")).toHaveValue("");
    expect(screen.getByLabelText("Price Currency")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Refresh Portfolio Evidence" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
  });

  it("locks invalid source evidence while retrieving a replacement snapshot", async () => {
    let resolveRefresh: ((book: ReturnType<typeof portfolioBook>) => void) | undefined;
    portfolioApiMocks.getRequiredPortfolioBook
      .mockResolvedValue(portfolioBook())
      .mockResolvedValueOnce(portfolioBook(undefined, { asOfDate: "2026-04-31" }))
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof portfolioBook>>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalWorkflowContextProvider
          initialModel={buildSimulationProposalWorkflowContext({
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          })}
        >
          <ProposalSimulateForm
            initialPortfolioId="PB_SG_GLOBAL_BAL_001"
            sourceContextConfirmed
          />
        </ProposalWorkflowContextProvider>
      </QueryClientProvider>,
    );

    const evidence = await waitForPortfolioEvidence("unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    await waitFor(() =>
      expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledTimes(2),
    );
    await waitForPortfolioEvidence("refreshing");
    expect(evidence).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Replacing invalid portfolio evidence")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled();
    expect(screen.getByLabelText("Currency")).toHaveValue("");
    expect(screen.getByLabelText("Price Currency")).toHaveValue("");

    await act(async () => resolveRefresh?.(portfolioBook()));
    await waitForPortfolioEvidence("ready");
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Price Currency")).toHaveValue("USD");
  });

  it("derives and admits a valid leap-day advisory date from source", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockImplementation(
      async (
        portfolioId: string,
        params: { asOfDate?: string; reportingCurrency?: string } = {},
      ) =>
        portfolioBook(undefined, {
          portfolioId,
          asOfDate: params.asOfDate ?? "2028-02-29",
          currency: params.reportingCurrency,
        }),
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalWorkflowContextProvider
          initialModel={buildSimulationProposalWorkflowContext({
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          })}
        >
          <ProposalSimulateForm
            initialPortfolioId="PB_SG_GLOBAL_BAL_001"
            sourceContextConfirmed
          />
        </ProposalWorkflowContextProvider>
      </QueryClientProvider>,
    );

    const evidence = await waitForPortfolioEvidence("ready");
    expect(evidence).toHaveAttribute("data-requested-as-of-date", "2028-02-29");
    expect(evidence).toHaveAttribute("data-effective-as-of-date", "2028-02-29");
    expect(evidence).not.toHaveAttribute("data-evidence-date-issue");
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenLastCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2028-02-29", reportingCurrency: "USD" },
    );
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  });

  it("keeps proposal actions and portfolio links closed when the shell did not confirm context", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001", "USD", false);

    expect(portfolioApiMocks.getRequiredPortfolioBook).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "View proposal queue" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Proposal actions remain unavailable until the review context confirms the selected portfolio.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));
    await waitForPortfolioEvidence();

    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "View proposal queue" })).not.toBeInTheDocument();
  });

  it("preserves a carried reporting-currency override when source identity differs", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValue(
      portfolioBook(undefined, { currency: "SGD" }),
    );

    renderForm("PB_SG_GLOBAL_BAL_001", "EUR");

    await waitForPortfolioEvidence("context_mismatch");
    expect(screen.queryByLabelText("Portfolio Currency")).not.toBeInTheDocument();
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2026-04-10", reportingCurrency: "EUR" },
    );
  });

  it("keeps construction before the final control rail in DOM order and preserves portfolio scope", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const draftTitle = screen.getByLabelText("Advisory Draft Title");
    const controlRail = screen
      .getByRole("heading", { name: "Review and retain" })
      .closest("section");

    expect(controlRail).not.toBeNull();
    expect(
      draftTitle.compareDocumentPosition(controlRail as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "View proposal queue" })).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });

  it("fences both final actions and announces source progress while evaluation is pending", async () => {
    const pendingEvaluation = deferred<ReturnType<typeof workspaceEnvelope>>();
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockReturnValueOnce(pendingEvaluation.promise);
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    expect(
      await screen.findByRole("status", { name: "Proposal evaluation status" })
    ).toHaveTextContent("Waiting for the source-owned assessment.");
    expect(screen.getByRole("button", { name: "Evaluating proposal…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();

    await act(async () => pendingEvaluation.resolve(workspaceEnvelope()));
    expect(await screen.findByText("Evaluation confirmed")).toBeInTheDocument();
  });

  it("withdraws evaluation confirmation when the advisor materially changes the draft", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    expect(await screen.findByText("Evaluation confirmed")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Advise Evaluation Summary" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Additional Cash Assumption"), {
      target: { value: "12500" },
    });

    expect(screen.queryByText("Evaluation confirmed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Advise Evaluation Summary" })
    ).not.toBeInTheDocument();
  });

  it("withdraws evaluation confirmation before refreshing source portfolio evidence", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    expect(await screen.findByText("Evaluation confirmed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    expect(screen.queryByText("Evaluation confirmed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Advise Evaluation Summary" })
    ).not.toBeInTheDocument();
    await waitForPortfolioEvidence();
  });

  it("withdraws evaluation confirmation after an automatic cached-evidence refresh", async () => {
    let originalContextReads = 0;
    portfolioApiMocks.getRequiredPortfolioBook.mockImplementation(
      async (
        portfolioId: string,
        params: { asOfDate?: string; reportingCurrency?: string } = {}
      ) => {
        if (params.asOfDate === "2026-04-10") {
          originalContextReads += 1;
          if (originalContextReads > 1) {
            return portfolioBook(
              [
                {
                  security_id: "MSFT",
                  instrument_name: "Microsoft Corp.",
                  asset_class: "Equities",
                  quantity: 80,
                  market_price: 420,
                  market_value_base: 33600,
                  weight_pct: 33.6,
                },
              ],
              {
                portfolioId,
                asOfDate: params.asOfDate,
                currency: params.reportingCurrency,
              }
            );
          }
        }
        return portfolioBook(undefined, {
          portfolioId,
          asOfDate: params.asOfDate,
          currency: params.reportingCurrency,
        });
      }
    );
    const { queryClient } = renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    expect(await screen.findByText("Evaluation confirmed")).toBeInTheDocument();

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "proposal-position-builder-book",
          "PB_SG_GLOBAL_BAL_001",
          "2026-04-10",
          "USD",
        ],
        refetchType: "active",
      });
    });

    expect(await screen.findByText("Microsoft Corp.")).toBeInTheDocument();
    expect(originalContextReads).toBe(2);
    expect(screen.queryByText("Evaluation confirmed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Advise Evaluation Summary" })
    ).not.toBeInTheDocument();
  });

  it("prevents source evidence refresh while evaluation is pending", async () => {
    const pendingEvaluation = deferred<ReturnType<typeof workspaceEnvelope>>();
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockReturnValueOnce(pendingEvaluation.promise);
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));
    await screen.findByRole("status", { name: "Proposal evaluation status" });
    expect(
      screen.getByRole("button", { name: "Refresh Portfolio Evidence" })
    ).toBeDisabled();

    await act(async () => pendingEvaluation.resolve(workspaceEnvelope()));

    expect(await screen.findByText("Evaluation confirmed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh Portfolio Evidence" })
    ).toBeEnabled();
  });

  it("applies the admitted cash assumption to proposed impact while preserving current value", async () => {
    renderForm();
    await waitForPortfolioEvidence();

    const impactPanel = screen.getByTestId("proposal-draft-impact");
    expect(within(impactPanel).getByText("USD 44,000")).toBeInTheDocument();
    expect(within(impactPanel).getAllByText("USD 54,000")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Additional Cash Assumption"), {
      target: { value: "20000" },
    });

    await waitFor(() =>
      expect(within(impactPanel).getAllByText("USD 64,000")).toHaveLength(2)
    );
    expect(within(impactPanel).getByText("USD 44,000")).toBeInTheDocument();
  });

  it("evaluates a source-authorized proposal with zero additional cash", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption");
    fireEvent.change(cashInput, { target: { value: "0" } });
    fireEvent.blur(cashInput);

    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeEnabled();
    expect(
      screen.getByText(
        "Evaluation uses the source-confirmed portfolio snapshot; the additional cash assumption changes indicative impact only."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    await waitFor(() => expect(advisoryApiMocks.createAdvisoryWorkspace).toHaveBeenCalled());
    expect(advisoryApiMocks.createAdvisoryWorkspace.mock.calls[0][0].body).not.toHaveProperty(
      "cash_amount"
    );
    expect(advisoryApiMocks.createAdvisoryWorkspace.mock.calls[0][0].body.stateful_input).not.toHaveProperty(
      "cash_amount"
    );
  });

  it("saves a source-authorized proposal when the optional cash assumption is blank", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption");
    fireEvent.change(cashInput, { target: { value: "" } });
    fireEvent.blur(cashInput);
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    await waitFor(() => expect(advisoryApiMocks.handoffAdvisoryWorkspace).toHaveBeenCalled());
    expect(advisoryApiMocks.createAdvisoryWorkspace.mock.calls[0][0].body.stateful_input).toEqual({
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      as_of: "2026-04-10",
    });
  });

  it("blocks both workflow actions and identifies a negative cash assumption", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption");
    fireEvent.change(cashInput, { target: { value: "-250" } });
    fireEvent.blur(cashInput);

    await waitFor(() => expect(cashInput).toHaveAttribute("aria-invalid", "true"));
    expect(
      screen.getAllByText(
        "Additional cash assumption cannot be negative. Enter 0 or a positive amount."
      )
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-blocked-by",
      "additional_cash"
    );
    expect(screen.getByText("Additional cash needs correction")).toBeInTheDocument();
    expect(screen.queryByText("Current Value")).not.toBeInTheDocument();
    expect(advisoryApiMocks.createAdvisoryWorkspace).not.toHaveBeenCalled();
  });

  it("preserves malformed cash text for correction and recovers on blank input", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption") as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "1,000" } });
    fireEvent.blur(cashInput);

    expect(cashInput.value).toBe("1,000");
    await waitFor(() => expect(cashInput).toHaveAttribute("aria-invalid", "true"));
    expect(
      screen.getAllByText(
        "Enter additional cash as a number without currency symbols or separators, or leave it blank."
      )
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();

    fireEvent.change(cashInput, { target: { value: "" } });

    await waitFor(() => expect(cashInput).toHaveAttribute("aria-invalid", "false"));
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  });

  it("rejects a large fractional assumption before browser numeric rounding", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption") as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "99999999999999.99" } });
    fireEvent.blur(cashInput);

    expect(cashInput.value).toBe("99999999999999.99");
    await waitFor(() => expect(cashInput).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("Additional cash assumption is too large to model reliably.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-blocked-by",
      "additional_cash"
    );
  });

  it("blocks aggregate impact that crosses the reliable cent-resolution boundary", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const cashInput = screen.getByLabelText("Additional Cash Assumption");
    fireEvent.change(cashInput, { target: { value: "70368744177663.99" } });

    await waitFor(() =>
      expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
        "data-preview-blocked-by",
        "monetary_precision"
      )
    );
    expect(cashInput).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText("Draft amount exceeds reliable range")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();

    fireEvent.change(cashInput, { target: { value: "10000" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled()
    );
  });

  it("uses one cent-precision boundary for cash-movement preview and submission", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    const movementAmount = screen.getByLabelText("Amount");
    fireEvent.change(movementAmount, { target: { value: "1.0000000001" } });

    expect(
      screen.getByText(
        "Use no more than 2 decimal places and remain within the reliable draft range."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Net Needs correction")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-blocked-by",
      "currency"
    );
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(advisoryApiMocks.createAdvisoryWorkspace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "USD" } });
    fireEvent.change(movementAmount, { target: { value: "2.68" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    await waitFor(() => expect(advisoryApiMocks.applyAdvisoryWorkspaceDraftAction).toHaveBeenCalled());
    expect(advisoryApiMocks.applyAdvisoryWorkspaceDraftAction.mock.calls[0][1]).toMatchObject({
      body: { cash_flow: { amount: "2.68" } },
    });
  });

  it("keeps governed portfolio context out of editable proposal controls", async () => {
    renderForm("PORT_UI_1001");
    expect(screen.getByRole("heading", { name: "Scenario assumptions" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio Currency")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Advisory As-of Date")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mandate ID")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Additional Cash Assumption")).toBeInTheDocument();
    await waitForPortfolioEvidence();
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledWith(
      "PORT_UI_1001",
      { asOfDate: "2026-04-10", reportingCurrency: "USD" },
    );
  });

  it("moves the workflow rail from construction to the source-retained draft", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    expect(
      screen.getByRole("heading", { name: "Draft not yet persisted" })
    ).toBeInTheDocument();
    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(
      await screen.findByRole("heading", { name: "Advisor draft saved" })
    ).toBeInTheDocument();
    expect(screen.getByText("Draft retained for review")).toBeInTheDocument();
    expect(screen.getAllByText("pp_test_001").length).toBeGreaterThan(0);
    const inlineBoundary = document.querySelector(
      '[data-context-presentation="inline"]'
    );
    expect(inlineBoundary).toHaveTextContent("Advisory proposal lifecycle");
    expect(inlineBoundary).not.toHaveTextContent(
      "No persisted advisory workflow record"
    );
    expect(screen.queryByText("Draft not yet persisted")).not.toBeInTheDocument();
  });

  it("keeps the retained-draft queue link scoped to the portfolio that was saved", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));
    await screen.findByText("Advisor draft retained");

    expect(screen.queryByLabelText("Portfolio ID")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View proposal queue" })).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });

  it("submits the schema-normalized portfolio identifier when saving a draft", async () => {
    renderForm("  PB_SG_GLOBAL_BAL_001  ");

    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    await waitFor(() => expect(advisoryApiMocks.createAdvisoryWorkspace).toHaveBeenCalled());
    expect(advisoryApiMocks.createAdvisoryWorkspace).toHaveBeenCalledWith({
      body: expect.objectContaining({
        stateful_input: expect.objectContaining({
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
        }),
      }),
    });
  });

  it("retains construction-only posture when draft persistence fails", async () => {
    advisoryApiMocks.handoffAdvisoryWorkspace.mockRejectedValueOnce(
      new WorkbenchApiError(
        "advisory workspace request",
        403,
        "corr-handoff-denied-001"
      )
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Save Advisor Draft" }));

    expect(
      await screen.findByText(
        "This proposal action is not available for your current access. No proposal change was recorded."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch advisory workspace request (403)"))
      .not.toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Proposal action failure" })).toHaveTextContent(
      "Proposal action not completed"
    );
    expect(screen.getByText(/Request reference corr-handoff-denied-001/)).not.toBeVisible();
    fireEvent.click(
      within(screen.getByTestId("proposal-builder-workflow-rail")).getByText(
        "Support details"
      )
    );
    expect(screen.getByText(/Request reference corr-handoff-denied-001/)).toBeInTheDocument();
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

    await waitForPortfolioEvidence();
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
    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Buy More" }));

    const instrumentInputs = screen.getAllByLabelText("Instrument") as HTMLInputElement[];
    expect(instrumentInputs.some((input) => input.value === "AAPL")).toBe(true);
  });

  it("keeps valid quantity actions available when indicative notionals require cent rounding", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValue(
      portfolioBook([
        {
          security_id: "FRACTIONAL-PRICE",
          instrument_name: "Fractional Price Holding",
          asset_class: "Equities",
          quantity: 3,
          market_price: 6_333.333333,
          market_value_base: 19_000,
          weight_pct: 43.2,
        },
      ])
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    expect(await screen.findByText("Fractional Price Holding")).toBeInTheDocument();
    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Buy More" }));
    const quantityInputs = screen.getAllByLabelText("Quantity") as HTMLInputElement[];
    fireEvent.change(quantityInputs[quantityInputs.length - 1], { target: { value: "1" } });

    await waitFor(() =>
      expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
        "data-preview-status",
        "available"
      )
    );
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeEnabled();
  });

  it("withholds impact when an active draft price uses another currency", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Buy More" }));
    const quantityInputs = screen.getAllByLabelText("Quantity") as HTMLInputElement[];
    const priceCurrencyInputs = screen.getAllByLabelText(
      "Price Currency"
    ) as HTMLInputElement[];
    fireEvent.change(quantityInputs[quantityInputs.length - 1], { target: { value: "10" } });
    fireEvent.change(priceCurrencyInputs[priceCurrencyInputs.length - 1], {
      target: { value: "EUR" },
    });

    const impactPanel = screen.getByTestId("proposal-draft-impact");
    await waitFor(() =>
      expect(impactPanel).toHaveAttribute("data-preview-currency-status", "mixed_currency")
    );
    expect(within(impactPanel).getByText("Currency-aligned impact is unavailable")).toBeInTheDocument();
    expect(within(impactPanel).queryByText("USD 44,000")).not.toBeInTheDocument();
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
    expect(screen.getByText(/Source reference aws_test_001/)).toBeInTheDocument();
  });

  it("keeps evaluation failure explicit without claiming the workspace was evaluated", async () => {
    advisoryApiMocks.evaluateAdvisoryWorkspace.mockRejectedValueOnce(
      new WorkbenchApiError("advisory workspace request", 503)
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Evaluate Workspace" }));

    expect(
      await screen.findByText(
        "The proposal could not be evaluated from the current source evidence. Confirm portfolio holdings and try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch advisory workspace request (503)"))
      .not.toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Proposal action failure" })).toHaveTextContent(
      "Proposal action not completed"
    );
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

    await waitForPortfolioEvidence();
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

    await waitForPortfolioEvidence();
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
    expect(screen.getByText(/Source reference aws_test_001/)).toBeInTheDocument();
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

    await waitForPortfolioEvidence();
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
    await waitForPortfolioEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Sell Down" }));

    const quantityInputs = screen.getAllByLabelText("Quantity") as HTMLInputElement[];
    fireEvent.change(quantityInputs[quantityInputs.length - 1], { target: { value: "150" } });
    expect(
      screen.getByText("1 sell line capped to available units")
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

  it("does not present unavailable sources as a confirmed empty portfolio", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockRejectedValueOnce(
      new Error("portfolio book unavailable")
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence("unavailable");
    expect(screen.getByText("Portfolio evidence is unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Current holdings could not be loaded. No empty-book fallback is shown.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/confirmed with no current investment positions/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(advisoryApiMocks.createAdvisoryWorkspace).not.toHaveBeenCalled();
  });

  it("keeps available holdings visible but blocks actions when combined-book cash is malformed", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce({
      ...portfolioBook(),
      summary: {
        ...portfolioBook().summary,
        cash_market_value_base: undefined,
      },
    });
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence("partial");
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("Portfolio evidence is incomplete")).toBeInTheDocument();
    expect(screen.getByText("Additional cash assumption")).toBeInTheDocument();
    const positionsPanel = screen.getByRole("heading", { name: "Current Positions" }).closest("section");
    expect(positionsPanel).not.toBeNull();
    expect(
      within(positionsPanel!).getByText("1 position · incomplete evidence")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy More" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sell Down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
  });

  it("shows active recovery and retry after incomplete evidence refresh fails", async () => {
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    portfolioApiMocks.getRequiredPortfolioBook
      .mockResolvedValueOnce({
        ...portfolioBook(),
        summary: {
          ...portfolioBook().summary,
          cash_market_value_base: undefined,
        },
      })
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof portfolioBook>>((_resolve, reject) => {
            rejectRefresh = reject;
          })
      );
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence("partial");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    await waitForPortfolioEvidence("refreshing");
    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Buy More" })).toBeDisabled();
    await act(async () => rejectRefresh?.(new Error("incomplete book refresh failed")));
    await waitForPortfolioEvidence("refresh_failed");
    expect(screen.getByText("Latest portfolio evidence is not confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh Portfolio Evidence" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Buy More" })).toBeDisabled();
  });

  it("treats an empty source-backed book as ready rather than unavailable", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce(portfolioBook([]));
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence();
    expect(screen.getAllByText("Confirmed empty").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/portfolio book is confirmed with no current investment positions/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  });

  it("recovers unavailable portfolio evidence through an intentional source refresh", async () => {
    portfolioApiMocks.getRequiredPortfolioBook
      .mockRejectedValueOnce(new Error("portfolio book unavailable"))
      .mockResolvedValueOnce(portfolioBook());
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence("unavailable");
    const cashInput = screen.getByLabelText("Additional Cash Assumption");
    fireEvent.change(cashInput, { target: { value: "0" } });
    fireEvent.blur(cashInput);
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    await waitForPortfolioEvidence();
    expect(screen.getByText("Portfolio evidence confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  });

  it("retains cached evidence but blocks actions after a failed refresh", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();
    portfolioApiMocks.getRequiredPortfolioBook.mockRejectedValueOnce(
      new Error("portfolio book refresh unavailable")
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    await waitForPortfolioEvidence("refresh_failed");
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("Latest portfolio evidence is not confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-currency-status",
      "available"
    );
  });

  it("keeps source refreshes locked to the governed advisory date", async () => {
    renderForm("PB_SG_GLOBAL_BAL_001");
    await waitForPortfolioEvidence();

    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2026-04-10", reportingCurrency: "USD" }
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    const panel = await waitForPortfolioEvidence();
    expect(panel).toHaveAttribute("data-requested-as-of-date", "2026-04-10");
    expect(panel).toHaveAttribute("data-effective-as-of-date", "2026-04-10");
    expect(portfolioApiMocks.getRequiredPortfolioBook).toHaveBeenLastCalledWith(
      "PB_SG_GLOBAL_BAL_001",
      { asOfDate: "2026-04-10", reportingCurrency: "USD" }
    );
  });

  it("fails closed and shows requested versus effective dates when source context mismatches", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce(
      portfolioBook(undefined, { asOfDate: "2026-04-09" })
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    const panel = await waitForPortfolioEvidence("context_mismatch");
    expect(panel).toHaveAttribute("data-requested-as-of-date", "2026-04-10");
    expect(panel).toHaveAttribute("data-effective-as-of-date", "2026-04-09");
    expect(screen.getByText("Portfolio context does not match")).toBeInTheDocument();
    const positionsPanel = screen.getByRole("heading", { name: "Current Positions" }).closest("section");
    expect(positionsPanel).not.toBeNull();
    expect(within(positionsPanel!).getByText("1 position · different context")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy More" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sell Down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
  });

  it("uses source currency for visible values when portfolio currency mismatches", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce(
      portfolioBook(undefined, { currency: "SGD" })
    );
    renderForm("PB_SG_GLOBAL_BAL_001");

    const evidencePanel = await waitForPortfolioEvidence("context_mismatch");
    const setupSummary = screen.getByLabelText("Proposal setup summary");
    const positionsPanel = screen.getByRole("heading", { name: "Current Positions" }).closest("section");
    expect(positionsPanel).not.toBeNull();
    expect(within(evidencePanel).getByText("SGD 25,000")).toBeInTheDocument();
    expect(within(setupSummary).getByText("SGD 25,000")).toBeInTheDocument();
    expect(within(positionsPanel!).getByText("SGD 19,000")).toBeInTheDocument();
    expect(screen.getByText("SGD portfolio book")).toBeInTheDocument();
    const impactPanel = screen.getByTestId("proposal-draft-impact");
    expect(impactPanel).toHaveAttribute("data-preview-currency-status", "mixed_currency");
    expect(impactPanel).toHaveAttribute("data-requested-currency", "USD");
    expect(impactPanel).toHaveAttribute("data-source-currency", "SGD");
    expect(within(impactPanel).getByText("Currency-aligned impact is unavailable")).toBeInTheDocument();
    expect(within(impactPanel).queryByText("USD 44,000")).not.toBeInTheDocument();
    expect(screen.getByText("Currency alignment required")).toBeInTheDocument();
  });

  it.each([null, "US"])(
    "does not relabel source money when portfolio currency is %s and restores it after refresh",
    async (unconfirmedCurrency) => {
      portfolioApiMocks.getRequiredPortfolioBook
        .mockResolvedValueOnce(portfolioBook(undefined, { currency: unconfirmedCurrency }))
        .mockResolvedValueOnce(portfolioBook(undefined, { currency: "USD" }));
      renderForm("PB_SG_GLOBAL_BAL_001");

      const evidencePanel = await screen.findByTestId("proposal-portfolio-evidence");
      const setupSummary = screen.getByLabelText("Proposal setup summary");
      const sourceCashSummary = within(setupSummary).getByText("Cash Context").closest("div");
      const positionsPanel = screen
        .getByRole("heading", { name: "Current Positions" })
        .closest("section");
      expect(positionsPanel).not.toBeNull();
      await waitFor(() =>
        expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
          "data-preview-currency-status",
          "unresolved"
        )
      );
      expect(within(evidencePanel).getByText("Currency not confirmed")).toBeInTheDocument();
      expect(sourceCashSummary).not.toBeNull();
      expect(within(sourceCashSummary!).getByText("Currency not confirmed")).toBeInTheDocument();
      expect(within(positionsPanel!).getByText("Currency not confirmed")).toBeInTheDocument();
      expect(within(evidencePanel).queryByText("USD 25,000")).not.toBeInTheDocument();
      expect(within(setupSummary).queryByText("USD 25,000")).not.toBeInTheDocument();
      expect(within(positionsPanel!).queryByText("USD 19,000")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Buy More" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

      await waitForPortfolioEvidence();
      await waitFor(() =>
        expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
          "data-preview-currency-status",
          "available"
        )
      );
      expect(within(evidencePanel).getByText("USD 25,000")).toBeInTheDocument();
      expect(within(sourceCashSummary!).getByText("USD 25,000")).toBeInTheDocument();
      expect(within(positionsPanel!).getByText("USD 19,000")).toBeInTheDocument();
    }
  );

  it("keeps manual scenario cash in proposal currency when partial source currency differs", async () => {
    portfolioApiMocks.getRequiredPortfolioBook.mockResolvedValueOnce({
      ...portfolioBook(undefined, { currency: "SGD" }),
      summary: {
        ...portfolioBook().summary,
        cash_market_value_base: undefined,
      },
    });
    renderForm("PB_SG_GLOBAL_BAL_001");

    const evidencePanel = await waitForPortfolioEvidence("partial");
    const setupSummary = screen.getByLabelText("Proposal setup summary");
    expect(within(evidencePanel).getByText("USD 10,000")).toBeInTheDocument();
    expect(within(setupSummary).getByText("USD 10,000")).toBeInTheDocument();
    expect(within(setupSummary).getByText("Currency alignment required")).toBeInTheDocument();
    expect(screen.queryByText("SGD 10,000")).not.toBeInTheDocument();
    expect(screen.getByText("SGD portfolio book")).toBeInTheDocument();
    expect(screen.getByTestId("proposal-draft-impact")).toHaveAttribute(
      "data-preview-currency-status",
      "mixed_currency"
    );
  });

  it("shows active recovery and refresh failure for mismatched evidence", async () => {
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    portfolioApiMocks.getRequiredPortfolioBook
      .mockResolvedValueOnce(portfolioBook(undefined, { asOfDate: "2026-04-09" }))
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof portfolioBook>>((_resolve, reject) => {
            rejectRefresh = reject;
          })
      );
    renderForm("PB_SG_GLOBAL_BAL_001");

    await waitForPortfolioEvidence("context_mismatch");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Portfolio Evidence" }));

    await waitForPortfolioEvidence("refreshing");
    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled();
    await act(async () => rejectRefresh?.(new Error("mismatched book refresh failed")));
    await waitForPortfolioEvidence("refresh_failed");
    expect(screen.getByText("Latest portfolio evidence is not confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh Portfolio Evidence" })).toBeEnabled();
  });

});
