"use client";

import { useState } from "react";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import {
  createPortfolioReportBatch,
  getReportBatchStatus,
  runReportBatchOnce,
} from "@/features/workbench/api";
import type {
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "@/features/workbench/types";

type Props = {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  bookingCenterCode?: string | null;
  benchmarkCode?: string;
};

function statusTone(status: string): "default" | "success" | "warn" | "danger" {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "succeeded") {
    return "success";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "danger";
  }
  if (normalized === "running" || normalized === "materialized" || normalized === "waiting_on_report_job") {
    return "warn";
  }
  return "default";
}

function summarizeCounts(status: ReportBatchStatusResponse | null): string {
  if (!status) {
    return "No batch materialized";
  }
  return Object.entries(status.status_counts)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

function isTerminalBatchStatus(status: string | undefined): boolean {
  return status === "completed" || status === "completed_with_failures" || status === "failed" || status === "cancelled";
}

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
  const [pendingAction, setPendingAction] = useState<"create" | "refresh" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const batchId = status?.batch_id ?? handle?.batch_id ?? null;
  const runDisabled = !batchId || pendingAction !== null || isTerminalBatchStatus(status?.status);
  const reconciledReportJobId =
    runResult?.report_job_ids[0] ??
    status?.items.find((item) => item.report_job_id !== null)?.report_job_id ??
    "No report job";

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
          title="Report batch operation failed"
          body={error}
        />
      ) : null}

      <div className="report-batch-status-strip">
        <SemanticBadge tone={statusTone(status?.status ?? handle?.status ?? "not_created")}>
          {status?.status ?? handle?.status ?? "Not created"}
        </SemanticBadge>
        <span>{batchId ?? "No batch id"}</span>
        <span>{summarizeCounts(status)}</span>
      </div>

      {runResult ? (
        <div className="report-batch-run-summary">
          <span>Leased {runResult.leased_count}</span>
          <span>Dispatched {runResult.dispatched_count}</span>
          <span>Executed {runResult.executed_count}</span>
          <span>{reconciledReportJobId}</span>
          {runResult.back_pressure_reasons.length > 0 ? (
            <span>Back pressure {runResult.back_pressure_reasons.join(", ")}</span>
          ) : null}
          {runResult.skipped_reason ? <span>Skipped {runResult.skipped_reason}</span> : null}
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
            item.status,
            item.report_job_id ?? "Not linked",
            item.attempt_count.toString(),
          ],
        }))}
        emptyState={{
          title: "No batch items yet",
          body: "Create a report batch to materialize the current portfolio review item.",
        }}
      />
    </SectionBlock>
  );
}
