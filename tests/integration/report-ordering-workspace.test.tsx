import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportOrderingWorkspace } from "@/features/report-ordering/components/report-ordering-workspace";
import {
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewOrder,
} from "@/features/report-ordering/api";
import { parseReportOrderingResponse } from "@/features/report-ordering/contracts";
import { WorkbenchApiError } from "@/features/workbench/api-client";
import {
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

vi.mock("@/features/report-ordering/api", () => ({
  getReportOrderingOptions: vi.fn(),
  listPortfolioReviewOrders: vi.fn(),
  submitPortfolioReviewOrder: vi.fn(),
}));

const optionsMock = vi.mocked(getReportOrderingOptions);
const historyMock = vi.mocked(listPortfolioReviewOrders);
const submitMock = vi.mocked(submitPortfolioReviewOrder);

const portfolio = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  displayName: "Global Balanced Mandate",
  asOfDate: "2026-04-22",
  baseCurrency: "SGD",
};

describe("ReportOrderingWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
