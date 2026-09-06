import { describe, expect, it } from "vitest";

import { admitReportJobReceipt } from "@/features/report-ordering/report-job-receipt";

const reviewedKey = "workbench-report-order-reviewed";

function handle(overrides: Record<string, string> = {}) {
  return {
    report_request_id: "rrq_1",
    report_job_id: "rjob_1",
    status: "accepted",
    status_url: "/api/v1/report-jobs/rjob_1",
    idempotency_key: reviewedKey,
    ...overrides,
  };
}

describe("report job receipt admission", () => {
  it("accepts the exact reviewed key and matching Gateway status path", () => {
    const receipt = handle();

    expect(admitReportJobReceipt(receipt, reviewedKey)).toBe(receipt);
  });

  it("accepts a percent-encoded status identity for the same opaque job", () => {
    const receipt = handle({
      report_job_id: "rjob/with space",
      status_url: "/api/v1/report-jobs/rjob%2Fwith%20space",
    });

    expect(admitReportJobReceipt(receipt, reviewedKey)).toBe(receipt);
  });

  it("rejects a receipt for another idempotent request", () => {
    expect(() =>
      admitReportJobReceipt(
        handle({ idempotency_key: "another-request" }),
        reviewedKey,
      ),
    ).toThrow("reviewed request intent");
  });

  it.each([
    "/api/v1/report-jobs/rjob_other",
    "/api/v1/report-jobs/rjob_1/",
    "/api/v1/report-jobs/rjob_1?view=other",
    "/api/v1/report-jobs/rjob_1#other",
    "/api/v1/report-jobs/%",
    "https://report.example/api/v1/report-jobs/rjob_1",
    "/reports/jobs/rjob_1",
  ])("rejects an inconsistent or malformed status link: %s", (statusUrl) => {
    expect(() =>
      admitReportJobReceipt(handle({ status_url: statusUrl }), reviewedKey),
    ).toThrow("matching status reference");
  });
});
