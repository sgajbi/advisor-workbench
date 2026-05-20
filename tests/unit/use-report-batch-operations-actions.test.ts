import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReportBatchOperationsActions } from "../../src/features/workbench/use-report-batch-operations-actions";
import {
  createPortfolioReportBatch,
  getArchivedDocumentMetadata,
  getReportBatchStatus,
  runReportBatchOnce,
} from "../../src/features/workbench/api";

vi.mock("../../src/features/workbench/api", () => ({
  createPortfolioReportBatch: vi.fn(),
  getArchivedDocumentMetadata: vi.fn(),
  getReportBatchStatus: vi.fn(),
  runReportBatchOnce: vi.fn(),
}));

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
  items: [],
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
  completed_at: null,
};

function renderActions() {
  return renderHook(() =>
    useReportBatchOperationsActions({
      portfolioId: "PF_1001",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      bookingCenterCode: "SG",
      benchmarkCode: "BMK_GLOBAL_BALANCED_60_40",
    })
  );
}

describe("useReportBatchOperationsActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("materializes a single-portfolio report batch and loads source-owned status", async () => {
    vi.mocked(createPortfolioReportBatch).mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    vi.mocked(getReportBatchStatus).mockResolvedValue(materializedStatus);
    const { result } = renderActions();

    act(() => {
      result.current.createBatch();
    });

    await waitFor(() => {
      expect(createPortfolioReportBatch).toHaveBeenCalledWith({
        portfolioId: "PF_1001",
        asOfDate: "2026-02-24",
        reportingCurrency: "USD",
        bookingCenterCode: "SG",
        benchmarkCode: "BMK_GLOBAL_BALANCED_60_40",
      });
    });
    await waitFor(() => expect(result.current.batchId).toBe("rbch_1"));
    expect(getReportBatchStatus).toHaveBeenCalledWith("rbch_1", {
      bookingCenterCode: "SG",
    });
    expect(result.current.status?.status).toBe("materialized");
  });

  it("runs a bounded worker pass through Gateway and refreshes status", async () => {
    vi.mocked(createPortfolioReportBatch).mockResolvedValue({
      batch_id: "rbch_1",
      status: "materialized",
      status_url: "/api/v1/report-batches/rbch_1",
      idempotency_key: "idem",
      item_count: 1,
    });
    vi.mocked(getReportBatchStatus)
      .mockResolvedValueOnce(materializedStatus)
      .mockResolvedValue(completedStatus);
    vi.mocked(runReportBatchOnce).mockResolvedValue({
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
    const { result } = renderActions();

    act(() => {
      result.current.createBatch();
    });
    await waitFor(() => expect(result.current.batchId).toBe("rbch_1"));

    act(() => {
      result.current.runOnce();
    });

    await waitFor(() => {
      expect(runReportBatchOnce).toHaveBeenCalledWith({
        batchId: "rbch_1",
        bookingCenterCode: "SG",
      });
    });
    await waitFor(() => expect(result.current.runResult?.executed_count).toBe(1));
    expect(result.current.status?.status).toBe("completed");
    expect(result.current.runDisabled).toBe(true);
  });

  it("retrieves archived document metadata and trims the operator-entered reference", async () => {
    vi.mocked(getArchivedDocumentMetadata).mockResolvedValue({
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
    const { result } = renderActions();

    act(() => {
      result.current.setArchiveDocumentId(" doc_1 ");
    });
    await waitFor(() => expect(result.current.archiveDocumentId).toBe(" doc_1 "));

    act(() => {
      result.current.loadArchiveDocument();
    });

    await waitFor(() => {
      expect(getArchivedDocumentMetadata).toHaveBeenCalledWith("doc_1", {
        current: true,
        bookingCenterCode: "SG",
      });
    });
    await waitFor(() => expect(result.current.archiveMetadata?.documentId).toBe("doc_1"));
  });

  it("fails closed when batch or archive identifiers are absent", async () => {
    const { result } = renderActions();

    act(() => {
      result.current.refreshStatus();
      result.current.runOnce();
      result.current.loadArchiveDocument();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getReportBatchStatus).not.toHaveBeenCalled();
    expect(runReportBatchOnce).not.toHaveBeenCalled();
    expect(getArchivedDocumentMetadata).not.toHaveBeenCalled();
  });
});
