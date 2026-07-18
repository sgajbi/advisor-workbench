import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(await screen.findByRole("heading", { name: "Approved report" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-04-22")).toHaveAccessibleName("Report date");
    expect(screen.getByDisplayValue("SGD")).toHaveAccessibleName("Reporting currency");
    expect(screen.getByRole("radio", { name: /Structured data package/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Governed PDF document/ })).toBeDisabled();
    expect(screen.getByText(/PDF creation is temporarily unavailable/)).toBeInTheDocument();
    expect(screen.queryByText("render_metadata_unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-report")).not.toBeInTheDocument();

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

    expect(await screen.findByText("Report request recorded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Accepted" })).toBeDisabled();
    expect(screen.getByText(/does not mean a document was archived or sent/)).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        outputFormat: "json",
        sections: ["CLIENT_PROFILE", "OVERVIEW", "PERFORMANCE"],
        idempotencyKey: expect.stringMatching(/^workbench-report-order-/),
      }),
    );
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

  it("renders an intentional permission state without exposing configuration controls", async () => {
    optionsMock.mockRejectedValue(new WorkbenchApiError("report ordering options", 403));

    render(<ReportOrderingWorkspace portfolio={portfolio} />);

    expect(await screen.findByText("Report ordering is restricted")).toBeInTheDocument();
    expect(screen.getByText(/not available for report ordering/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approved report" })).not.toBeInTheDocument();
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
