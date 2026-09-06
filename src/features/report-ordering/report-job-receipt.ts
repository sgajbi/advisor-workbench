import type { ReportJobHandle } from "./contracts";

const REPORT_JOB_STATUS_PATH = "/api/v1/report-jobs/";

export function admitReportJobReceipt(
  handle: ReportJobHandle,
  reviewedIdempotencyKey: string,
): ReportJobHandle {
  if (handle.idempotency_key !== reviewedIdempotencyKey) {
    throw new Error(
      "The accepted report did not match the reviewed request intent.",
    );
  }
  if (!statusPathNamesReportJob(handle.status_url, handle.report_job_id)) {
    throw new Error(
      "The accepted report did not provide its matching status reference.",
    );
  }
  return handle;
}

function statusPathNamesReportJob(
  statusUrl: string,
  reportJobId: string,
): boolean {
  if (!statusUrl.startsWith(REPORT_JOB_STATUS_PATH)) return false;
  const encodedJobId = statusUrl.slice(REPORT_JOB_STATUS_PATH.length);
  if (
    !encodedJobId ||
    encodedJobId.includes("/") ||
    encodedJobId.includes("?") ||
    encodedJobId.includes("#")
  ) {
    return false;
  }
  try {
    return decodeURIComponent(encodedJobId) === reportJobId;
  } catch {
    return false;
  }
}
