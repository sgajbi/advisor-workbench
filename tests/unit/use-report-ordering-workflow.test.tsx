import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewOrder,
} from "@/features/report-ordering/api";
import { parseReportOrderingResponse } from "@/features/report-ordering/contracts";
import { useReportOrderingWorkflow } from "@/features/report-ordering/use-report-ordering-workflow";
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

describe("useReportOrderingWorkflow", () => {
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

  it("loads source choices and recent requests for the selected portfolio", async () => {
    const { result } = renderHook(() =>
      useReportOrderingWorkflow({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        reportingCurrency: "SGD",
      }),
    );

    await waitFor(() => expect(result.current.catalogueState).toBe("ready"));
    await waitFor(() => expect(result.current.historyState).toBe("ready"));

    expect(optionsMock).toHaveBeenCalledWith("PB_SG_GLOBAL_BAL_001");
    expect(historyMock).toHaveBeenCalledWith("PB_SG_GLOBAL_BAL_001");
    expect(result.current.configuration).toEqual(
      expect.objectContaining({
        asOfDate: "2026-04-22",
        reportingCurrency: "SGD",
        outputFormat: "json",
      }),
    );
    expect(result.current.historyRows[0].statusLabel).toBe("Report data complete");
  });

  it("preserves one idempotency intent across a safe retry", async () => {
    submitMock
      .mockRejectedValueOnce(new Error("temporary unavailable"))
      .mockResolvedValueOnce({
        report_request_id: "rrq_2",
        report_job_id: "rjob_2",
        status: "accepted",
        status_url: "/api/v1/report-jobs/rjob_2",
        idempotency_key: "intent_2",
      });
    const { result } = renderHook(() =>
      useReportOrderingWorkflow({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        reportingCurrency: "SGD",
      }),
    );
    await waitFor(() => expect(result.current.model?.canSubmit).toBe(true));

    act(() => {
      expect(result.current.reviewRequest()).toBe(true);
    });
    await waitFor(() => expect(result.current.preflightReviewed).toBe(true));

    await act(async () => {
      expect(await result.current.submitRequest()).toBe(false);
    });
    expect(result.current.submissionError).toContain("preserved for a safe retry");
    await act(async () => {
      expect(await result.current.submitRequest()).toBe(true);
    });

    const firstIntent = submitMock.mock.calls[0][0].idempotencyKey;
    const secondIntent = submitMock.mock.calls[1][0].idempotencyKey;
    expect(firstIntent).toBe(secondIntent);
    expect(firstIntent).toMatch(/^workbench-report-order-/);
    expect(result.current.canSubmitReviewedRequest).toBe(false);
  });

  it("submits a PDF when the source catalogue marks document creation ready", async () => {
    const payload = buildReportOrderingResponse();
    payload.catalogueAvailability.state = "ready";
    payload.reportFamilies[0].availability.state = "ready";
    payload.reportFamilies[0].orderingModes[0].defaultOutputFormat = "pdf";
    payload.reportFamilies[0].outputFormats[1] = {
      ...payload.reportFamilies[0].outputFormats[1],
      state: "ready",
      reasonCode: "governed_document_ready",
    };
    optionsMock.mockResolvedValue(parseReportOrderingResponse(payload));
    const { result } = renderHook(() =>
      useReportOrderingWorkflow({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        reportingCurrency: "SGD",
      }),
    );

    await waitFor(() => expect(result.current.configuration?.outputFormat).toBe("pdf"));
    expect(result.current.model?.canSubmit).toBe(true);
    act(() => {
      expect(result.current.reviewRequest()).toBe(true);
    });
    await act(async () => {
      expect(await result.current.submitRequest()).toBe(true);
    });

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outputFormat: "pdf",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      }),
    );
  });

  it("invalidates reviewed preflight when output-affecting configuration changes", async () => {
    const { result } = renderHook(() =>
      useReportOrderingWorkflow({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-04-22",
        reportingCurrency: "SGD",
      }),
    );
    await waitFor(() => expect(result.current.model?.canSubmit).toBe(true));
    act(() => {
      result.current.reviewRequest();
    });
    await waitFor(() => expect(result.current.preflightReviewed).toBe(true));

    act(() => {
      result.current.updateConfiguration({ asOfDate: "2026-04-23" });
    });

    expect(result.current.preflightReviewed).toBe(false);
    expect(result.current.canSubmitReviewedRequest).toBe(false);
    await act(async () => {
      expect(await result.current.submitRequest()).toBe(false);
    });
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("resets scope-bound state when the selected portfolio changes", async () => {
    const { result, rerender } = renderHook(
      ({ portfolioId }) =>
        useReportOrderingWorkflow({
          portfolioId,
          asOfDate: "2026-04-22",
          reportingCurrency: "SGD",
        }),
      { initialProps: { portfolioId: "PB_SG_GLOBAL_BAL_001" } },
    );
    await waitFor(() => expect(result.current.model?.canSubmit).toBe(true));
    act(() => {
      result.current.reviewRequest();
    });
    await waitFor(() => expect(result.current.preflightReviewed).toBe(true));

    rerender({ portfolioId: "PB_SG_OTHER_002" });

    await waitFor(() => expect(optionsMock).toHaveBeenCalledWith("PB_SG_OTHER_002"));
    expect(result.current.preflightReviewed).toBe(false);
    expect(result.current.submittedHandle).toBeNull();
  });

  it("ignores a late catalogue response from the previously selected portfolio", async () => {
    let resolveFirst: ((value: ReturnType<typeof parseReportOrderingResponse>) => void) | null = null;
    const firstResponse = new Promise<ReturnType<typeof parseReportOrderingResponse>>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    const secondPayload = buildReportOrderingResponse();
    secondPayload.scopeSelection.scopeId = "PB_SG_OTHER_002";
    optionsMock.mockImplementation((portfolioId) =>
      portfolioId === "PB_SG_GLOBAL_BAL_001"
        ? firstResponse
        : Promise.resolve(parseReportOrderingResponse(secondPayload)),
    );
    const { result, rerender } = renderHook(
      ({ portfolioId }) =>
        useReportOrderingWorkflow({
          portfolioId,
          asOfDate: "2026-04-22",
          reportingCurrency: "SGD",
        }),
      { initialProps: { portfolioId: "PB_SG_GLOBAL_BAL_001" } },
    );

    rerender({ portfolioId: "PB_SG_OTHER_002" });
    await waitFor(() =>
      expect(result.current.catalogue?.scopeSelection?.scopeId).toBe("PB_SG_OTHER_002"),
    );
    act(() => {
      resolveFirst?.(parseReportOrderingResponse(buildReportOrderingResponse()));
    });

    await waitFor(() =>
      expect(result.current.catalogue?.scopeSelection?.scopeId).toBe("PB_SG_OTHER_002"),
    );
  });
});
