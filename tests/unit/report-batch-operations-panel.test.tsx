import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const createPortfolioReportBatchMock = vi.fn();
const getReportBatchStatusMock = vi.fn();
const runReportBatchOnceMock = vi.fn();
const getArchivedDocumentMetadataMock = vi.fn();

vi.mock("../../src/features/workbench/api", () => ({
  buildArchivedDocumentDownloadUrl: (documentId: string) =>
    `/api/bff/api/v1/documents/${encodeURIComponent(documentId)}/download`,
  createPortfolioReportBatch: (...args: unknown[]) => createPortfolioReportBatchMock(...args),
  getArchivedDocumentMetadata: (...args: unknown[]) => getArchivedDocumentMetadataMock(...args),
  getReportBatchStatus: (...args: unknown[]) => getReportBatchStatusMock(...args),
  runReportBatchOnce: (...args: unknown[]) => runReportBatchOnceMock(...args),
}));

import ReportBatchOperationsPanel from "../../src/features/workbench/components/report-batch-operations-panel";

const completedStatus = {
  batch_id: "rbch_1",
  selector_mode: "explicit_portfolio_list",
  tenant_id: "tenant-sg",
  region: "APAC",
  materialized_portfolio_ids: ["PF_1001"],
  as_of_date: "2026-02-24",
  requested_output_formats: ["pdf"],
  reporting_currency: "USD",
  status: "completed",
  item_count: 1,
  status_counts: { succeeded: 1 },
  items: [
    {
      batch_item_id: "rbit_1",
      item_position: 1,
      portfolio_id: "PF_1001",
      status: "succeeded",
      report_job_id: "rjob_1",
      attempt_count: 1,
      retry_eligible: false,
      next_retry_at: null,
      last_error_category: null,
      last_error_summary: null,
      created_at: "2026-02-24T00:00:00Z",
      started_at: "2026-02-24T00:00:01Z",
      completed_at: "2026-02-24T00:00:02Z",
      cancelled_at: null,
    },
  ],
  created_at: "2026-02-24T00:00:00Z",
  updated_at: "2026-02-24T00:00:02Z",
  started_at: "2026-02-24T00:00:01Z",
  completed_at: "2026-02-24T00:00:02Z",
  cancelled_at: null,
  failed_at: null,
  correlation_id: "corr",
  trace_id: "trace",
};

const materializedStatus = {
  ...completedStatus,
  status: "materialized",
  status_counts: { materialized: 1 },
  items: [
    {
      ...completedStatus.items[0],
      status: "materialized",
      report_job_id: null,
      attempt_count: 0,
      started_at: null,
      completed_at: null,
    },
  ],
  completed_at: null,
};

describe("ReportBatchOperationsPanel", () => {
  afterEach(() => {
    createPortfolioReportBatchMock.mockReset();
    getArchivedDocumentMetadataMock.mockReset();
    getReportBatchStatusMock.mockReset();
    runReportBatchOnceMock.mockReset();
  });

  it("creates a report batch and renders durable item status", async () => {
    createPortfolioReportBatchMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    getReportBatchStatusMock.mockResolvedValue(completedStatus);

    render(
      <ReportBatchOperationsPanel
        portfolioId="PF_1001"
        asOfDate="2026-02-24"
        reportingCurrency="USD"
        bookingCenterCode="SG"
        benchmarkCode="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Batch" }));

    await waitFor(() => {
      expect(createPortfolioReportBatchMock).toHaveBeenCalledWith({
        portfolioId: "PF_1001",
        asOfDate: "2026-02-24",
        reportingCurrency: "USD",
        bookingCenterCode: "SG",
        benchmarkCode: "BMK_GLOBAL_BALANCED_60_40",
      });
    });
    expect(getReportBatchStatusMock).toHaveBeenCalledWith("rbch_1", { bookingCenterCode: "SG" });
    expect(await screen.findByText("rbch_1")).toBeInTheDocument();
    expect(screen.getByText("succeeded: 1")).toBeInTheDocument();
    expect(screen.getByText("rjob_1")).toBeInTheDocument();
  });

  it("runs a bounded worker pass for the current batch", async () => {
    createPortfolioReportBatchMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    getReportBatchStatusMock.mockResolvedValueOnce(materializedStatus).mockResolvedValue(completedStatus);
    runReportBatchOnceMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "completed",
      batch_status_before: "materialized",
      batch_status_after: "completed",
      recovered_count: 0,
      leased_count: 1,
      dispatched_count: 1,
      executed_count: 1,
      report_job_ids: ["rjob_1"],
      back_pressure_reasons: [],
      skipped_reason: null,
      execution_results: [],
      status_url: "/api/v1/report-batches/rbch_1",
    });

    render(
      <ReportBatchOperationsPanel
        portfolioId="PF_1001"
        asOfDate="2026-02-24"
        reportingCurrency="USD"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Batch" }));
    await screen.findByText("rbch_1");
    fireEvent.click(screen.getByRole("button", { name: "Run Once" }));

    await waitFor(() => {
      expect(runReportBatchOnceMock).toHaveBeenCalledWith({
        batchId: "rbch_1",
        bookingCenterCode: undefined,
      });
    });
    expect(await screen.findByText("Leased 1")).toBeInTheDocument();
    expect(screen.getByText("Executed 1")).toBeInTheDocument();
  });

  it("surfaces worker back pressure reasons without hiding batch status", async () => {
    createPortfolioReportBatchMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    getReportBatchStatusMock.mockResolvedValue(materializedStatus);
    runReportBatchOnceMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      batch_status_before: "materialized",
      batch_status_after: "materialized",
      recovered_count: 0,
      leased_count: 0,
      dispatched_count: 0,
      executed_count: 0,
      report_job_ids: [],
      back_pressure_reasons: ["max_active_items_reached"],
      skipped_reason: null,
      execution_results: [],
      status_url: "/api/v1/report-batches/rbch_1",
    });

    render(
      <ReportBatchOperationsPanel
        portfolioId="PF_1001"
        asOfDate="2026-02-24"
        reportingCurrency="USD"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Batch" }));
    await screen.findByText("rbch_1");
    fireEvent.click(screen.getByRole("button", { name: "Run Once" }));

    expect(await screen.findByText("Back pressure max_active_items_reached")).toBeInTheDocument();
  });

  it("retrieves archived document metadata through the gateway-backed archive surface", async () => {
    getArchivedDocumentMetadataMock.mockResolvedValue({
      correlationId: "corr-archive-document-1",
      contractVersion: "v1",
      sourceService: "lotus-archive",
      documentId: "doc_1",
      reportJobId: "rjob_1",
      reportRequestId: "rrq_1",
      reportType: "PORTFOLIO_REVIEW",
      portfolioScope: "single_portfolio",
      portfolioId: "PF_1001",
      clientReference: "relationship-1",
      asOfDate: "2026-02-24",
      reportingPeriodStart: "2026-01-01",
      reportingPeriodEnd: "2026-02-24",
      frequency: "ad_hoc",
      templateId: "portfolio-review",
      templateVersion: "v1",
      renderServiceVersion: "render.1",
      reportDataContractVersion: "v1",
      checksumAlgorithm: "sha256",
      checksum: "abc123",
      sizeBytes: 2048,
      mimeType: "application/pdf",
      outputFormat: "pdf",
      classification: "confidential",
      region: "APAC",
      tenantId: "tenant-sg",
      retentionPolicyId: "retention-7y",
      retentionStartDate: "2026-02-24",
      retainUntilDate: "2033-02-24",
      purgeStatus: "not_due",
      legalHoldStatus: "none",
      legalHoldCount: 0,
      supersedesDocumentId: null,
      supersededByDocumentId: null,
      correctionOfDocumentId: null,
      reissueOfDocumentId: null,
      createdByService: "lotus-report",
      createdByActor: "report-worker",
      createdAt: "2026-02-24T00:00:00Z",
      updatedAt: "2026-02-24T00:00:00Z",
      downloadUrl: "/api/v1/documents/doc_1/download",
    });

    render(
      <ReportBatchOperationsPanel
        portfolioId="PF_1001"
        asOfDate="2026-02-24"
        reportingCurrency="USD"
        bookingCenterCode="SG"
      />
    );

    fireEvent.change(screen.getByLabelText("Archived document ID"), {
      target: { value: "doc_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load Document" }));

    await waitFor(() => {
      expect(getArchivedDocumentMetadataMock).toHaveBeenCalledWith("doc_1", {
        current: true,
        bookingCenterCode: "SG",
      });
    });
    expect(await screen.findByText("PORTFOLIO_REVIEW")).toBeInTheDocument();
    expect(screen.getByText("retention-7y")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "/api/bff/api/v1/documents/doc_1/download"
    );
  });

  it("does not offer run once after a terminal batch status is loaded", async () => {
    createPortfolioReportBatchMock.mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    getReportBatchStatusMock.mockResolvedValue(completedStatus);

    render(
      <ReportBatchOperationsPanel
        portfolioId="PF_1001"
        asOfDate="2026-02-24"
        reportingCurrency="USD"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Batch" }));
    await screen.findByText("succeeded: 1");

    expect(screen.getByRole("button", { name: "Run Once" })).toBeDisabled();
  });
});
