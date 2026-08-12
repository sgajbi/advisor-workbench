import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportOrderingWorkspace } from "@/features/report-ordering/components/report-ordering-workspace";
import {
  getPortfolioReviewBatchStatus,
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewBatch,
  submitPortfolioReviewOrder,
} from "@/features/report-ordering/api";
import {
  parseReportBatchHandle,
  parseReportBatchStatus,
  parseReportOrderingResponse,
} from "@/features/report-ordering/contracts";
import { WorkbenchApiError } from "@/features/workbench/api-client";
import { useAdvisorBook } from "@/features/advisor-book/use-advisor-book";
import {
  buildReportBatchHandle,
  buildReportBatchStatus,
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

vi.mock("@/features/report-ordering/api", () => ({
  getPortfolioReviewBatchStatus: vi.fn(),
  getReportOrderingOptions: vi.fn(),
  listPortfolioReviewOrders: vi.fn(),
  submitPortfolioReviewBatch: vi.fn(),
  submitPortfolioReviewOrder: vi.fn(),
}));

vi.mock("@/features/advisor-book/use-advisor-book", () => ({
  useAdvisorBook: vi.fn(),
}));

function buildAdvisorBookResult({
  currentPortfolioStatus = "ACTIVE",
  includeCurrentPortfolio = true,
}: {
  currentPortfolioStatus?: "ACTIVE" | "INACTIVE";
  includeCurrentPortfolio?: boolean;
} = {}) {
  const items = [
    ...(includeCurrentPortfolio ? [{
      portfolio_id: "PB_SG_GLOBAL_BAL_001", display_name: "Global Balanced Mandate",
      client_id: "CLIENT_001", base_currency: "SGD", booking_center_code: "Singapore",
      mandate_type: "ADVISORY" as const, status: currentPortfolioStatus,
      opened_on: "2020-01-01", closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1" as const,
      membership_reference: "membership-1", membership_basis: "governed_role_assignment" as const,
    }] : []),
    {
      portfolio_id: "PB_SG_INCOME_002", display_name: "Income Preservation Mandate",
      client_id: "CLIENT_002", base_currency: "USD", booking_center_code: "Singapore",
      mandate_type: "DISCRETIONARY" as const, status: "ACTIVE" as const,
      opened_on: "2021-01-01", closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1" as const,
      membership_reference: "membership-2", membership_basis: "governed_role_assignment" as const,
    },
  ];
  return {
    loading: false,
    error: null,
    reload: vi.fn(),
    response: {
      correlation_id: "corr-book",
      contract_version: "v1" as const,
      scope: {
        kind: "own_book" as const, label: "My book" as const,
        as_of_date: "2026-04-22", booking_center_code: "Singapore",
      },
      items,
      page: {
        total_count: 150, offset: 0, limit: 100, returned_count: items.length,
        sort_by: "client_id" as const, sort_order: "asc" as const,
      },
      supportability: {
        state: "ready" as const, reason_code: "advisor_book_ready" as const,
        tenant_scope: "source_confirmed" as const, limitations: [],
      },
      provenance: null,
    },
  };
}

const optionsMock = vi.mocked(getReportOrderingOptions);
const historyMock = vi.mocked(listPortfolioReviewOrders);
const submitMock = vi.mocked(submitPortfolioReviewOrder);
const submitBatchMock = vi.mocked(submitPortfolioReviewBatch);
const batchStatusMock = vi.mocked(getPortfolioReviewBatchStatus);
const advisorBookMock = vi.mocked(useAdvisorBook);

const portfolio = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  displayName: "Global Balanced Mandate",
  asOfDate: "2026-04-22",
  baseCurrency: "SGD",
};

describe("ReportOrderingWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    advisorBookMock.mockReturnValue(buildAdvisorBookResult());
    optionsMock.mockResolvedValue(
      parseReportOrderingResponse(buildReportOrderingResponse()),
    );
    historyMock.mockResolvedValue(buildReportJobListResponse());
    submitMock.mockResolvedValue({
      report_request_id: "rrq_2",
      report_job_id: "rjob_2",
      status: "accepted",
      status_url: "/api/v1/report-jobs/rjob_2",
      idempotency_key: "intent_2",
    });
    submitBatchMock.mockResolvedValue(parseReportBatchHandle(buildReportBatchHandle()));
    batchStatusMock.mockResolvedValue(parseReportBatchStatus(buildReportBatchStatus()));
  });

  it("renders a source-backed advisor flow and keeps unavailable PDF disabled", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(screen.getByText("Loading approved reports")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Checking report availability",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Approved report" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-04-22")).toHaveAccessibleName("Report date");
    expect(screen.getByDisplayValue("SGD")).toHaveAccessibleName("Reporting currency");
    expect(screen.getByRole("radio", { name: /Structured data package/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Governed PDF document/ })).toBeDisabled();
    expect(screen.getByText(/PDF creation is temporarily unavailable/)).toBeInTheDocument();
    expect(
      screen.getByText(/default allocation view maintained for this portfolio/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/source-owned default/i)).not.toBeInTheDocument();
    expect(screen.queryByText("render_metadata_unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-report")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Review report contents"));
    const requiredSection = screen.getByRole("checkbox", {
      name: /Client and mandate profile/,
    });
    expect(requiredSection).toBeChecked();
    expect(requiredSection).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Asset class" })).not.toBeChecked();
  });

  it("requires an explicit review before idempotent submission", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    const submitButton = screen.getByRole("button", { name: "Submit Report Request" });
    expect(submitButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    expect(
      await screen.findByRole("heading", { name: "Report request accepted" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Report request readiness" }),
      ).toHaveFocus(),
    );
    expect(
      within(screen.getByRole("status")).getByRole("heading", {
        name: "Report request accepted",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Report request accepted")).toHaveLength(1);
    expect(screen.queryByText("Report request recorded")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approved report" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Recent portfolio report requests" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Report Request" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create another report" })).toBeEnabled();
    expect(screen.getByText("rjob_2")).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        outputFormat: "json",
        sections: ["CLIENT_PROFILE", "OVERVIEW", "PERFORMANCE"],
        idempotencyKey: expect.stringMatching(/^workbench-report-order-/),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create another report" }));
    expect(await screen.findByRole("heading", { name: "Approved report" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Report configuration")).toHaveFocus(),
    );
    expect(screen.queryByText("Report request accepted")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Report Request" })).toBeDisabled();
  });

  it("selects a source-backed portfolio bundle and shows per-portfolio outcomes", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Portfolio Bundle" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("table", { name: "Portfolio report bundle outcomes" })).toBeInTheDocument();
    expect(screen.getByText("Report data complete")).toBeInTheDocument();
    expect(screen.getByText("Needs retry")).toBeInTheDocument();
    expect(submitBatchMock).toHaveBeenCalledWith(expect.objectContaining({
      portfolioIds: ["PB_SG_GLOBAL_BAL_001", "PB_SG_INCOME_002"],
      idempotencyKey: expect.stringMatching(/^workbench-report-order-/),
    }));
    expect(batchStatusMock).toHaveBeenCalledWith("rbch_1");
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("pages through the source-owned advisor book instead of truncating bundle selection", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    expect(screen.getByText("1–2 of 150 portfolios")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next portfolios" }));

    expect(advisorBookMock).toHaveBeenCalledWith(expect.objectContaining({
      asOfDate: "2026-04-22",
      offset: 100,
      limit: 100,
    }));
  });

  it("does not count an inactive routed portfolio before source-owned book confirmation", async () => {
    advisorBookMock.mockReturnValue(
      buildAdvisorBookResult({ currentPortfolioStatus: "INACTIVE" }),
    );
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    await waitFor(() => expect(screen.getByText("0 selected")).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: /Global Balanced Mandate/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Portfolio Bundle" })).toBeDisabled();
  });

  it("invalidates bundle readiness when the source-owned advisor book becomes unavailable", async () => {
    const view = render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    advisorBookMock.mockReturnValue({
      loading: false,
      error: new Error("book unavailable"),
      reload: vi.fn(),
      response: null,
    });
    view.rerender(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(
      await screen.findByRole("heading", { name: "Portfolio selection unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Portfolio Bundle" })).toBeDisabled();
    expect(screen.getByText(/Restore My book before reviewing this bundle/)).toBeInTheDocument();
  });

  it("locks the reviewed portfolio bundle while its source submission is pending", async () => {
    let resolveSubmission:
      | ((value: Awaited<ReturnType<typeof submitPortfolioReviewBatch>>) => void)
      | null = null;
    submitBatchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    const secondPortfolio = screen.getByRole("checkbox", { name: /Income Preservation Mandate/ });
    fireEvent.click(secondPortfolio);
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(
      await screen.findByRole("heading", { name: "Submitting portfolio bundle" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Selected portfolio/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Portfolio bundle/ })).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "Filter portfolios on this page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next portfolios" })).toBeDisabled();
    expect(secondPortfolio).toBeDisabled();
    expect(screen.getByLabelText("Report date")).toBeDisabled();
    expect(screen.getByLabelText("Reporting currency")).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Structured data package/ })).toBeDisabled();

    await act(async () => {
      resolveSubmission?.(parseReportBatchHandle(buildReportBatchHandle()));
    });
    expect(
      await screen.findByRole("heading", { name: "Portfolio bundle accepted" }),
    ).toBeInTheDocument();
    expect(submitBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioIds: ["PB_SG_GLOBAL_BAL_001", "PB_SG_INCOME_002"],
      }),
    );
  });

  it("keeps a late prior-batch status response out of the active bundle", async () => {
    const firstHandle = buildReportBatchHandle();
    firstHandle.batch_id = "rbch_first";
    firstHandle.status_url = "/api/v1/report-batches/rbch_first";
    const secondHandle = buildReportBatchHandle();
    secondHandle.batch_id = "rbch_second";
    secondHandle.status_url = "/api/v1/report-batches/rbch_second";
    submitBatchMock
      .mockResolvedValueOnce(parseReportBatchHandle(firstHandle))
      .mockResolvedValueOnce(parseReportBatchHandle(secondHandle));

    const firstStatus = buildReportBatchStatus();
    firstStatus.batch_id = "rbch_first";
    firstStatus.items[1].last_error_summary = "Stale first-batch outcome";
    const secondStatus = buildReportBatchStatus();
    secondStatus.batch_id = "rbch_second";
    secondStatus.items[1].last_error_summary = "Current second-batch outcome";
    let resolveFirstStatus:
      | ((value: ReturnType<typeof parseReportBatchStatus>) => void)
      | null = null;
    batchStatusMock
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirstStatus = resolve;
      }))
      .mockResolvedValueOnce(parseReportBatchStatus(secondStatus));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const firstSubmit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(firstSubmit).toBeEnabled());
    fireEvent.click(firstSubmit);

    fireEvent.click(await screen.findByRole("button", { name: "Create another report" }));
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const secondSubmit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(secondSubmit).toBeEnabled());
    fireEvent.click(secondSubmit);
    expect(await screen.findByText("Current second-batch outcome")).toBeInTheDocument();

    await act(async () => {
      resolveFirstStatus?.(parseReportBatchStatus(firstStatus));
    });
    expect(screen.getByText("Current second-batch outcome")).toBeInTheDocument();
    expect(screen.queryByText("Stale first-batch outcome")).not.toBeInTheDocument();
  });

  it("reports cancelled portfolio outcomes separately from active work", async () => {
    const status = buildReportBatchStatus();
    (status as { status_counts: Record<string, number> }).status_counts = {
      succeeded: 1,
      cancelled: 1,
    };
    status.items[1].status = "cancelled";
    status.items[1].retry_eligible = false;
    status.items[1].last_error_category = null;
    status.items[1].last_error_summary = null;
    batchStatusMock.mockResolvedValue(parseReportBatchStatus(status));
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const summary = await screen.findByLabelText("Portfolio bundle summary");
    expect(within(summary).getByText("In progress").parentElement).toHaveTextContent("In progress0");
    expect(within(summary).getByText("Cancelled").parentElement).toHaveTextContent("Cancelled1");
    expect(screen.getByRole("table", { name: "Portfolio report bundle outcomes" })).toHaveTextContent("Cancelled");
  });

  it("surfaces a paused source batch separately from portfolio item progress", async () => {
    const status = buildReportBatchStatus();
    status.status = "paused";
    batchStatusMock.mockResolvedValue(parseReportBatchStatus(status));
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const summary = await screen.findByLabelText("Portfolio bundle summary");
    expect(within(summary).getByText("Batch status").parentElement).toHaveTextContent("Paused");
  });

  it("keeps a rejected portfolio bundle explicit and never renders success outcomes", async () => {
    submitBatchMock.mockRejectedValue(new Error("batch unavailable"));
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(
      await screen.findByRole("heading", { name: "Portfolio bundle not accepted" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Portfolio Bundle" })).toBeEnabled();
    expect(screen.queryByRole("table", { name: "Portfolio report bundle outcomes" })).not.toBeInTheDocument();
    expect(batchStatusMock).not.toHaveBeenCalled();
  });

  it("automatically retries a transient source-owned batch status failure", async () => {
    batchStatusMock
      .mockRejectedValueOnce(new Error("temporary status failure"))
      .mockResolvedValueOnce(parseReportBatchStatus(buildReportBatchStatus()));
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review Portfolio Bundle" }));
    const submit = screen.getByRole("button", { name: "Submit Portfolio Bundle" });
    await waitFor(() => expect(submit).toBeEnabled());
    const timerSpy = vi.spyOn(window, "setTimeout");
    try {
      fireEvent.click(submit);
      expect(
        await screen.findByRole("heading", { name: "Current outcomes unavailable" }),
      ).toBeInTheDocument();
      const retry = timerSpy.mock.calls.find(([, delay]) => delay === 10_000)?.[0];
      expect(retry).toEqual(expect.any(Function));

      await act(async () => {
        (retry as () => void)();
      });
      expect(
        await screen.findByRole("table", { name: "Portfolio report bundle outcomes" }),
      ).toBeInTheDocument();
      expect(batchStatusMock).toHaveBeenCalledTimes(2);
    } finally {
      timerSpy.mockRestore();
    }
  });

  it("clears stale bundle selection when the report date changes", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("radio", { name: /Portfolio bundle/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Income Preservation Mandate/ }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Report date"), {
      target: { value: "2026-04-23" },
    });

    await waitFor(() => expect(screen.getByText("1 selected")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Review Portfolio Bundle" })).toBeDisabled();
  });

  it("creates a second reviewed request with a fresh idempotency intent", async () => {
    submitMock
      .mockResolvedValueOnce({
        report_request_id: "rrq_2",
        report_job_id: "rjob_2",
        status: "accepted",
        status_url: "/api/v1/report-jobs/rjob_2",
        idempotency_key: "intent_2",
      })
      .mockResolvedValueOnce({
        report_request_id: "rrq_3",
        report_job_id: "rjob_3",
        status: "accepted",
        status_url: "/api/v1/report-jobs/rjob_3",
        idempotency_key: "intent_3",
      });
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });

    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    const firstSubmit = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(firstSubmit).toBeEnabled());
    fireEvent.click(firstSubmit);
    await screen.findByRole("heading", { name: "Report request accepted" });

    fireEvent.click(screen.getByRole("button", { name: "Create another report" }));
    fireEvent.click(await screen.findByRole("button", { name: "Review Request" }));
    const secondSubmit = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(secondSubmit).toBeEnabled());
    fireEvent.click(secondSubmit);

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2));
    expect(submitMock.mock.calls[0][0].idempotencyKey).not.toBe(
      submitMock.mock.calls[1][0].idempotencyKey,
    );
    expect(
      await screen.findByRole("heading", { name: "Report request accepted" }),
    ).toBeInTheDocument();
    expect(screen.getByText("rjob_3")).toBeInTheDocument();
  });

  it("does not steal focus from a new request when the prior history refresh settles", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    await screen.findByRole("table", { name: "Recent portfolio report requests" });

    let resolveHistory: (() => void) | null = null;
    historyMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHistory = () => resolve(buildReportJobListResponse());
        }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    const submitButton = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);
    await screen.findByRole("heading", { name: "Report request accepted" });

    fireEvent.click(screen.getByRole("button", { name: "Create another report" }));
    const configuration = await screen.findByRole("region", {
      name: "Report configuration",
    });
    await waitFor(() => expect(configuration).toHaveFocus());

    await act(async () => {
      resolveHistory?.();
    });
    await screen.findByRole("table", { name: "Recent portfolio report requests" });
    await waitFor(() => expect(configuration).toHaveFocus());
  });

  it("keeps recent report requests visible when support correlation is unavailable", async () => {
    const history = buildReportJobListResponse();
    history.items[0].correlationId = "";
    historyMock.mockResolvedValue(history);

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    const recentRequests = await screen.findByRole("table", {
      name: "Recent portfolio report requests",
    });
    expect(within(recentRequests).getByText("Portfolio review")).toBeInTheDocument();
    expect(within(recentRequests).getByText("rjob_1")).toBeInTheDocument();
    expect(screen.queryByText("Recent requests unavailable")).not.toBeInTheDocument();
  });

  it("invalidates reviewed readiness after a business-date change", async () => {
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    const submitButton = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(submitButton).toBeEnabled());

    fireEvent.change(screen.getByLabelText("Report date"), {
      target: { value: "2026-04-23" },
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Review Request" })).toBeEnabled();
  });

  it("renders only setup controls published by the selected report family", async () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies[0].configurationFields =
      payload.reportFamilies[0].configurationFields.filter(
        (field) => field.fieldId === "as_of_date",
      );
    optionsMock.mockResolvedValue(parseReportOrderingResponse(payload));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(await screen.findByLabelText("Report date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reporting currency")).not.toBeInTheDocument();
    expect(screen.queryByText("Comparison benchmark")).not.toBeInTheDocument();
    expect(screen.queryByText("Allocation views")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Request" })).toBeEnabled();
  });

  it("renders an intentional permission state without exposing configuration controls", async () => {
    optionsMock.mockRejectedValue(new WorkbenchApiError("report ordering options", 403));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(await screen.findByText("Report ordering is restricted")).toBeInTheDocument();
    expect(screen.getByText(/not available for report ordering/)).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(within(status).getByRole("heading", { name: "Report ordering restricted" })).toBeInTheDocument();
    expect(within(status).getByLabelText("Status Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Complete before review")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review Request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Report Request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approved report" })).not.toBeInTheDocument();
  });

  it("keeps source failure terminal in both workspace regions", async () => {
    optionsMock.mockRejectedValue(new Error("reporting unavailable"));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(await screen.findByText("Approved reports are unavailable")).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(within(status).getByRole("heading", { name: "Report ordering unavailable" })).toBeInTheDocument();
    expect(within(status).getByLabelText("Status Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Complete before review")).not.toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Try Again" });
    expect(retryButton).toBeEnabled();
    expect(screen.queryByText("Loading report readiness")).not.toBeInTheDocument();
    expect(optionsMock).toHaveBeenCalledTimes(1);
    fireEvent.click(retryButton);
    await waitFor(() => expect(optionsMock).toHaveBeenCalledTimes(2));
  });

  it("renders an empty approved catalogue without configuration or request actions", async () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies = [];
    optionsMock.mockResolvedValue(parseReportOrderingResponse(payload));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    const emptyPanels = await screen.findAllByText("No approved reports available");
    expect(emptyPanels).toHaveLength(2);
    const status = screen.getByRole("status");
    expect(within(status).getByLabelText("Status No approved reports")).toBeInTheDocument();
    expect(screen.queryByText("Complete before review")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No report is available for the selected portfolio and business role."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approved report" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review Request" })).not.toBeInTheDocument();
  });

  it("distinguishes incomplete setup from source availability", async () => {
    render(
      <ReportOrderingWorkspace
        portfolio={{ ...portfolio, asOfDate: "not-a-business-date" }}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Approved report" })).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(within(status).getByLabelText("Status Setup required")).toBeInTheDocument();
    expect(screen.getByText("Complete before review")).toBeInTheDocument();
    expect(screen.getByText("Select a valid report date.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Request" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit Report Request" })).toBeDisabled();
  });

  it("disables review actions while the reviewed request is submitting", async () => {
    let resolveSubmission:
      | ((value: Awaited<ReturnType<typeof submitPortfolioReviewOrder>>) => void)
      | null = null;
    submitMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    const submitButton = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    expect(
      await within(screen.getByRole("status")).findByRole("heading", {
        name: "Submitting report request",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reviewed" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submitting…" })).toBeDisabled();

    await act(async () => {
      resolveSubmission?.({
        report_request_id: "rrq_2",
        report_job_id: "rjob_2",
        status: "accepted",
        status_url: "/api/v1/report-jobs/rjob_2",
        idempotency_key: "intent_2",
      });
    });
    expect(
      await screen.findByRole("heading", { name: "Report request accepted" }),
    ).toBeInTheDocument();
  });

  it("preserves reviewed setup and offers an explicit retry after rejection", async () => {
    submitMock.mockRejectedValue(new Error("temporary unavailable"));
    render(<ReportOrderingWorkspace portfolio={portfolio} />);
    await screen.findByRole("heading", { name: "Approved report" });
    fireEvent.click(screen.getByRole("button", { name: "Review Request" }));
    const submitButton = screen.getByRole("button", { name: "Submit Report Request" });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading", { name: "Report request not accepted" })).toBeInTheDocument();
    expect(within(alert).getByLabelText("Status Not accepted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Report Request" })).toBeEnabled();
  });

  it("presents source-workflow evidence without offering a false ordering control", async () => {
    const payload = buildReportOrderingResponse();
    optionsMock.mockResolvedValue(
      parseReportOrderingResponse({
        ...payload,
        reportFamilies: [
          ...payload.reportFamilies,
          {
            ...structuredClone(payload.reportFamilies[0]),
            reportFamilyId: "proof_pack",
            businessLabel: "Pre-trade decision evidence",
            description: "Decision evidence created during suitability review.",
            orderingModes: [
              {
                modeId: "source_workflow",
                businessLabel: "Advisory workflow",
                description: "Created as part of an approved advisory decision.",
                defaultOutputFormat: "json",
                interactive: false,
                eligibility: {
                  state: "ready",
                  reasonCode: "source_workflow_ready",
                  message: "Created from its source business workflow.",
                },
              },
            ],
          },
        ],
      }),
    );

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(await screen.findByText("Created through business workflows")).toBeInTheDocument();
    expect(screen.getByText("Pre-trade decision evidence")).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /Pre-trade decision evidence/ }),
    ).not.toBeInTheDocument();
  });
});
