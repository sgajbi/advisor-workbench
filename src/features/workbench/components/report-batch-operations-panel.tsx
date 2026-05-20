"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import {
  buildArchivedDocumentDownloadUrl,
} from "@/features/workbench/api";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
import {
  reportBatchAvailabilityLabel,
  reportBatchJobAvailabilityLabel,
  reportBatchStatusTone,
  resolveReportBatchJobLabel,
  summarizeReportBatchCounts,
} from "@/features/workbench/report-batch-operations-panel-helpers";
import { useReportBatchOperationsActions } from "@/features/workbench/use-report-batch-operations-actions";

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
  const {
    handle,
    status,
    runResult,
    archiveDocumentId,
    archiveMetadata,
    pendingAction,
    error,
    batchId,
    runDisabled,
    setArchiveDocumentId,
    createBatch,
    refreshStatus,
    runOnce,
    loadArchiveDocument,
  } = useReportBatchOperationsActions({
    portfolioId,
    asOfDate,
    reportingCurrency,
    bookingCenterCode,
    benchmarkCode,
  });
  const reconciledReportJobId = resolveReportBatchJobLabel(runResult, status);

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
