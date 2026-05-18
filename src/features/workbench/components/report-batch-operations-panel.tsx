"use client";

import { useState } from "react";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import {
  buildArchivedDocumentDownloadUrl,
  createPortfolioReportBatch,
  getArchivedDocumentMetadata,
  getReportBatchStatus,
  runReportBatchOnce,
} from "@/features/workbench/api";
import type {
  ArchivedDocumentMetadataResponse,
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "@/features/workbench/types";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
import {
  isTerminalReportBatchStatus,
  reportBatchAvailabilityLabel,
  reportBatchJobAvailabilityLabel,
  reportBatchStatusTone,
  resolveReportBatchJobLabel,
  summarizeReportBatchCounts,
} from "@/features/workbench/report-batch-operations-panel-helpers";

type Props = {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  bookingCenterCode?: string | null;
  benchmarkCode?: string;
};

export default function ReportBatchOperationsPanel({
  portfolioId,
  asOfDate,
  reportingCurrency,
  bookingCenterCode,
  benchmarkCode,
}: Props) {
  const [handle, setHandle] = useState<ReportBatchHandleResponse | null>(null);
  const [status, setStatus] = useState<ReportBatchStatusResponse | null>(null);
  const [runResult, setRunResult] = useState<ReportBatchWorkerRunResponse | null>(null);
  const [archiveDocumentId, setArchiveDocumentId] = useState("");
  const [archiveMetadata, setArchiveMetadata] = useState<ArchivedDocumentMetadataResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<"create" | "refresh" | "run" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const batchId = status?.batch_id ?? handle?.batch_id ?? null;
  const runDisabled = !batchId || pendingAction !== null || isTerminalReportBatchStatus(status?.status);
  const reconciledReportJobId = resolveReportBatchJobLabel(runResult, status);

  async function createBatch() {
    setPendingAction("create");
    setError(null);
    try {
      const nextHandle = await createPortfolioReportBatch({
        portfolioId,
        asOfDate,
        reportingCurrency,
        bookingCenterCode,
        benchmarkCode,
      });
      setHandle(nextHandle);
      setStatus(await getReportBatchStatus(nextHandle.batch_id, { bookingCenterCode }));
      setRunResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report batch materialization failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function refreshStatus() {
    if (!batchId) return;
    setPendingAction("refresh");
    setError(null);
    try {
      setStatus(await getReportBatchStatus(batchId, { bookingCenterCode }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report batch status refresh failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function runOnce() {
    if (!batchId) return;
    setPendingAction("run");
    setError(null);
    try {
      const result = await runReportBatchOnce({
        batchId,
        bookingCenterCode,
      });
      setRunResult(result);
      setStatus(await getReportBatchStatus(batchId, { bookingCenterCode }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report batch run failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function loadArchiveDocument() {
    const documentId = archiveDocumentId.trim();
    if (!documentId) return;
    setPendingAction("archive");
    setError(null);
    try {
      setArchiveMetadata(
        await getArchivedDocumentMetadata(documentId, {
          current: true,
          bookingCenterCode,
        })
      );
    } catch (caught) {
      setArchiveMetadata(null);
      setError(caught instanceof Error ? caught.message : "Archived document retrieval failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      title="Report Batch Operations"
      subtitle={`PDF portfolio review batch for ${asOfDate}`}
      className="report-batch-operations-panel"
      actions={
        <div className="report-batch-action-row">
          <ActionButton priority="primary" onClick={createBatch} disabled={pendingAction !== null}>
            {handle ? "Reopen Batch" : "Create Batch"}
          </ActionButton>
          <ActionButton onClick={refreshStatus} disabled={!batchId || pendingAction !== null}>
            Refresh Status
          </ActionButton>
          <ActionButton onClick={runOnce} disabled={runDisabled}>
            Run Once
          </ActionButton>
        </div>
      }
    >
      {error ? (
        <ScreenStatePanel
          kind="error"
          surface="portfolio"
          title="Report operation failed"
          body={error}
        />
      ) : null}

      <div className="report-batch-status-strip">
        <SemanticBadge tone={reportBatchStatusTone(status?.status ?? handle?.status ?? "not_created")}>
          {businessStateLabel(status?.status ?? handle?.status ?? "Not created")}
        </SemanticBadge>
        <span>{reportBatchAvailabilityLabel(batchId)}</span>
        <span>{summarizeReportBatchCounts(status)}</span>
      </div>

      {runResult ? (
        <div className="report-batch-run-summary">
          <span>Leased {runResult.leased_count}</span>
          <span>Dispatched {runResult.dispatched_count}</span>
          <span>Executed {runResult.executed_count}</span>
          <span>{reportBatchJobAvailabilityLabel(reconciledReportJobId)}</span>
          {runResult.back_pressure_reasons.length > 0 ? (
            <span>Back pressure {runResult.back_pressure_reasons.map(formatBusinessReason).join(", ")}</span>
          ) : null}
          {runResult.skipped_reason ? <span>Skipped {formatBusinessReason(runResult.skipped_reason)}</span> : null}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="Report batch items"
        variant="portfolio"
        density="comfortable"
        columns={[
          { key: "portfolio", label: "Portfolio" },
          { key: "status", label: "Status" },
          { key: "job", label: "Report Job" },
          { key: "attempts", label: "Attempts", align: "right" },
        ]}
        rows={(status?.items ?? []).map((item) => ({
          key: item.batch_item_id,
          cells: [
            item.portfolio_id,
            businessStateLabel(item.status),
            item.report_job_id ? "Available" : "Not linked",
            item.attempt_count.toString(),
          ],
        }))}
        emptyState={{
          title: "No batch items yet",
          body: "Create a report batch to materialize the current portfolio review item.",
        }}
      />

      <div className="report-batch-archive-retrieval" aria-label="Archived document retrieval">
        <div className="report-batch-archive-controls">
          <label className="workbench-field-label" htmlFor="report-batch-archive-document-id">
            Archived document reference
          </label>
          <input
            id="report-batch-archive-document-id"
            className="workbench-input"
            value={archiveDocumentId}
            onChange={(event) => setArchiveDocumentId(event.target.value)}
            placeholder="Enter reference..."
          />
          <ActionButton
            onClick={loadArchiveDocument}
            disabled={!archiveDocumentId.trim() || pendingAction !== null}
          >
            Load Document
          </ActionButton>
        </div>
        {archiveMetadata ? (
          <div className="report-batch-archive-summary">
            <SemanticBadge tone={reportBatchStatusTone(archiveMetadata.purgeStatus)}>
              {archiveMetadata.outputFormat.toUpperCase()}
            </SemanticBadge>
            <span>{businessStateLabel(archiveMetadata.reportType)}</span>
            <span>{archiveMetadata.asOfDate}</span>
            <span>{archiveMetadata.retentionPolicyId ? "Retention policy available" : "No retention policy"}</span>
            <span>{businessStateLabel(archiveMetadata.legalHoldStatus)}</span>
            <a href={buildArchivedDocumentDownloadUrl(archiveMetadata.documentId)}>Download</a>
          </div>
        ) : (
          <p className="muted report-batch-archive-empty">
            Retrieve archived report details and downloads from the governed document archive.
          </p>
        )}
      </div>
    </SectionBlock>
  );
}
