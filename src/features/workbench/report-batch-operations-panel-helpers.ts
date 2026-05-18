import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import type {
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "@/features/workbench/types";

export type ReportBatchStatusTone = "default" | "success" | "warn" | "danger";

export function reportBatchStatusTone(status: string): ReportBatchStatusTone {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "succeeded") {
    return "success";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "danger";
  }
  if (
    normalized === "running" ||
    normalized === "materialized" ||
    normalized === "waiting_on_report_job"
  ) {
    return "warn";
  }
  return "default";
}

export function summarizeReportBatchCounts(status: ReportBatchStatusResponse | null): string {
  if (!status) {
    return "No batch materialized";
  }
  return Object.entries(status.status_counts)
    .map(([key, value]) => `${businessStateLabel(key)}: ${value}`)
    .join(" | ");
}

export function isTerminalReportBatchStatus(status: string | undefined): boolean {
  return (
    status === "completed" ||
    status === "completed_with_failures" ||
    status === "failed" ||
    status === "cancelled"
  );
}

export function resolveReportBatchJobLabel(
  runResult: ReportBatchWorkerRunResponse | null,
  status: ReportBatchStatusResponse | null
): string {
  return (
    runResult?.report_job_ids[0] ??
    status?.items.find((item) => item.report_job_id !== null)?.report_job_id ??
    "No report job"
  );
}

export function reportBatchAvailabilityLabel(batchId: string | null): string {
  return batchId ? "Report batch available" : "No report batch";
}

export function reportBatchJobAvailabilityLabel(reportJobId: string): string {
  return reportJobId !== "No report job" ? "Report job available" : reportJobId;
}
