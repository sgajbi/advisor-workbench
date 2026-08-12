import { describe, expect, it } from "vitest";

import {
  parseReportBatchHandle,
  parseReportBatchStatus,
  parseReportJobHandle,
  parseReportJobListResponse,
  parseReportOrderingResponse,
} from "@/features/report-ordering/contracts";
import {
  buildReportBatchHandle,
  buildReportBatchStatus,
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

describe("report ordering contracts", () => {
  it("accepts the governed Workbench ordering shape and independent format states", () => {
    const parsed = parseReportOrderingResponse(buildReportOrderingResponse());

    expect(parsed.reportFamilies[0].outputFormats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formatId: "json", state: "ready" }),
        expect.objectContaining({ formatId: "pdf", state: "unavailable" }),
      ]),
    );
  });

  it("fails closed when the Gateway contract contains an unknown primary field", () => {
    expect(() =>
      parseReportOrderingResponse({
        ...buildReportOrderingResponse(),
        sourceService: "lotus-report",
      }),
    ).toThrow();
  });

  it("fails closed for unsupported submission paths", () => {
    const altered = buildReportOrderingResponse() as Record<string, unknown>;
    const families = altered.reportFamilies as Array<Record<string, unknown>>;
    const modes = families[0].orderingModes as Array<Record<string, unknown>>;
    modes[0].submission = {
      ...(modes[0].submission as Record<string, unknown>),
      path: "/api/v1/internal/run-anything",
    };

    expect(() => parseReportOrderingResponse(altered)).toThrow();
  });

  it("parses durable job handles and bounded recent-request history", () => {
    expect(
      parseReportJobHandle({
        report_request_id: "rrq_1",
        report_job_id: "rjob_1",
        status: "accepted",
        status_url: "/api/v1/report-jobs/rjob_1",
        idempotency_key: "intent_1",
      }).status,
    ).toBe("accepted");

    const history = parseReportJobListResponse(buildReportJobListResponse());

    expect(history.items[0].portfolioScope.portfolio_ids).toEqual([
      "PB_SG_GLOBAL_BAL_001",
    ]);
  });

  it("keeps valid report history when a legacy job has no correlation reference", () => {
    const response = buildReportJobListResponse();
    response.items[0].correlationId = "";

    const history = parseReportJobListResponse(response);

    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toEqual(
      expect.objectContaining({
        reportJobId: "rjob_1",
        correlationId: "",
      }),
    );
  });

  it("parses durable batch acceptance and per-portfolio source outcomes", () => {
    expect(parseReportBatchHandle(buildReportBatchHandle()).item_count).toBe(2);
    const status = parseReportBatchStatus(buildReportBatchStatus());
    expect(status.status).toBe("completed_with_failures");
    expect(status.items.map((item) => item.status)).toEqual(["succeeded", "failed_retryable"]);
  });

  it("fails closed when a batch status invents an unsupported item state", () => {
    const response = buildReportBatchStatus();
    response.items[0].status = "emailed_to_client";
    expect(() => parseReportBatchStatus(response)).toThrow();
  });
});
