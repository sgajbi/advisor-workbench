const REPORT_JOB_LIFECYCLE_VALUES = [
  "accepted",
  "queued",
  "collecting_data",
  "data_ready",
  "rendering",
  "completed",
  "archiving",
  "archived",
  "completed_with_warnings",
  "failed",
  "cancelled",
] as const;

export type ReportJobLifecycleValue = (typeof REPORT_JOB_LIFECYCLE_VALUES)[number];

export function normalizeReportJobLifecycleValue(
  value: string | null | undefined,
): ReportJobLifecycleValue | null {
  const normalized = value?.toLowerCase();
  return normalized && (REPORT_JOB_LIFECYCLE_VALUES as readonly string[]).includes(normalized)
    ? (normalized as ReportJobLifecycleValue)
    : null;
}

export function isTerminalReportJobStatus(value: string | null | undefined): boolean {
  const normalized = normalizeReportJobLifecycleValue(value);
  return normalized === "completed" ||
    normalized === "archived" ||
    normalized === "completed_with_warnings" ||
    normalized === "failed" ||
    normalized === "cancelled";
}

export function isActiveReportJobLifecycle(
  status: string | null | undefined,
  currentStep: string | null | undefined,
): boolean {
  const normalizedStatus = normalizeReportJobLifecycleValue(status);
  const normalizedStep = normalizeReportJobLifecycleValue(currentStep);
  return normalizedStatus !== null &&
    normalizedStep !== null &&
    !isTerminalReportJobStatus(normalizedStatus);
}
