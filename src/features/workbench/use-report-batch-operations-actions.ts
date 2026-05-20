"use client";

import { useState } from "react";

import {
  createPortfolioReportBatch,
  getArchivedDocumentMetadata,
  getReportBatchStatus,
  runReportBatchOnce,
} from "@/features/workbench/api";
import { isTerminalReportBatchStatus } from "@/features/workbench/report-batch-operations-panel-helpers";
import type {
  ArchivedDocumentMetadataResponse,
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "@/features/workbench/types";

type ReportBatchPendingAction = "create" | "refresh" | "run" | "archive" | null;

type UseReportBatchOperationsActionsInput = {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  bookingCenterCode?: string | null;
  benchmarkCode?: string;
};

type UseReportBatchOperationsActionsResult = {
  handle: ReportBatchHandleResponse | null;
  status: ReportBatchStatusResponse | null;
  runResult: ReportBatchWorkerRunResponse | null;
  archiveDocumentId: string;
  archiveMetadata: ArchivedDocumentMetadataResponse | null;
  pendingAction: ReportBatchPendingAction;
  error: string | null;
  batchId: string | null;
  runDisabled: boolean;
  setArchiveDocumentId: (documentId: string) => void;
  createBatch: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  runOnce: () => Promise<void>;
  loadArchiveDocument: () => Promise<void>;
};

export function useReportBatchOperationsActions({
  portfolioId,
  asOfDate,
  reportingCurrency,
  bookingCenterCode,
  benchmarkCode,
}: UseReportBatchOperationsActionsInput): UseReportBatchOperationsActionsResult {
  const [handle, setHandle] = useState<ReportBatchHandleResponse | null>(null);
  const [status, setStatus] = useState<ReportBatchStatusResponse | null>(null);
  const [runResult, setRunResult] =
    useState<ReportBatchWorkerRunResponse | null>(null);
  const [archiveDocumentId, setArchiveDocumentId] = useState("");
  const [archiveMetadata, setArchiveMetadata] =
    useState<ArchivedDocumentMetadataResponse | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ReportBatchPendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const batchId = status?.batch_id ?? handle?.batch_id ?? null;
  const runDisabled =
    !batchId || pendingAction !== null || isTerminalReportBatchStatus(status?.status);

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
      setError(
        caught instanceof Error
          ? caught.message
          : "Report batch materialization failed."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function refreshStatus() {
    if (!batchId) {
      return;
    }
    setPendingAction("refresh");
    setError(null);
    try {
      setStatus(await getReportBatchStatus(batchId, { bookingCenterCode }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Report batch status refresh failed."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function runOnce() {
    if (!batchId) {
      return;
    }
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
    if (!documentId) {
      return;
    }
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
      setError(
        caught instanceof Error
          ? caught.message
          : "Archived document retrieval failed."
      );
    } finally {
      setPendingAction(null);
    }
  }

  return {
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
  };
}
