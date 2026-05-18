import { describe, expect, it } from "vitest";

import {
  isTerminalReportBatchStatus,
  reportBatchAvailabilityLabel,
  reportBatchJobAvailabilityLabel,
  reportBatchStatusTone,
  resolveReportBatchJobLabel,
  summarizeReportBatchCounts,
} from "../../src/features/workbench/report-batch-operations-panel-helpers";
import type {
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "../../src/features/workbench/types";

const statusResponse: ReportBatchStatusResponse = {
  batch_id: "batch_1",
  selector_mode: "single_portfolio",
  tenant_id: "tenant_private_bank",
  region: "SG",
  materialized_portfolio_ids: ["PB_SG_GLOBAL_BAL_001"],
  as_of_date: "2026-05-18",
  requested_output_formats: ["pdf"],
  reporting_currency: "USD",
  status: "materialized",
  item_count: 1,
  status_counts: { materialized: 1, waiting_on_report_job: 1 },
  items: [
    {
      batch_item_id: "item_1",
      item_position: 1,
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      status: "waiting_on_report_job",
      report_job_id: "report_job_1",
      attempt_count: 1,
      retry_eligible: false,
      next_retry_at: null,
      last_error_category: null,
      last_error_summary: null,
      created_at: "2026-05-18T00:00:00Z",
      started_at: null,
      completed_at: null,
      cancelled_at: null,
    },
  ],
  created_at: "2026-05-18T00:00:00Z",
  updated_at: null,
  started_at: null,
  completed_at: null,
  cancelled_at: null,
  failed_at: null,
  correlation_id: "corr_batch_1",
  trace_id: "trace_batch_1",
};

const runResponse: ReportBatchWorkerRunResponse = {
  batch_id: "batch_1",
  status: "completed",
  batch_status_before: "materialized",
  batch_status_after: "running",
  recovered_count: 0,
  leased_count: 1,
  dispatched_count: 1,
  executed_count: 1,
  report_job_ids: ["report_job_run_1"],
  back_pressure_reasons: [],
  skipped_reason: null,
  execution_results: [],
  status_url: "/api/v1/report-batches/batch_1",
};

describe("report batch operations panel helpers", () => {
  it("maps report and worker statuses to semantic tones", () => {
    expect(reportBatchStatusTone("completed")).toBe("success");
    expect(reportBatchStatusTone("succeeded")).toBe("success");
    expect(reportBatchStatusTone("failed")).toBe("danger");
    expect(reportBatchStatusTone("cancelled")).toBe("danger");
    expect(reportBatchStatusTone("running")).toBe("warn");
    expect(reportBatchStatusTone("waiting_on_report_job")).toBe("warn");
    expect(reportBatchStatusTone("not_created")).toBe("default");
  });

  it("summarizes source-owned status counts without recalculating item state", () => {
    expect(summarizeReportBatchCounts(null)).toBe("No batch materialized");
    expect(summarizeReportBatchCounts(statusResponse)).toBe(
      "Materialized: 1 | Waiting On Report Job: 1"
    );
  });

  it("gates run-once controls from terminal source statuses", () => {
    expect(isTerminalReportBatchStatus("completed")).toBe(true);
    expect(isTerminalReportBatchStatus("completed_with_failures")).toBe(true);
    expect(isTerminalReportBatchStatus("failed")).toBe(true);
    expect(isTerminalReportBatchStatus("cancelled")).toBe(true);
    expect(isTerminalReportBatchStatus("running")).toBe(false);
    expect(isTerminalReportBatchStatus(undefined)).toBe(false);
  });

  it("resolves report-job availability from worker output before batch items", () => {
    expect(resolveReportBatchJobLabel(runResponse, statusResponse)).toBe("report_job_run_1");
    expect(resolveReportBatchJobLabel(null, statusResponse)).toBe("report_job_1");
    expect(resolveReportBatchJobLabel({ ...runResponse, report_job_ids: [] }, null)).toBe(
      "No report job"
    );
  });

  it("keeps availability labels deterministic", () => {
    expect(reportBatchAvailabilityLabel("batch_1")).toBe("Report batch available");
    expect(reportBatchAvailabilityLabel(null)).toBe("No report batch");
    expect(reportBatchJobAvailabilityLabel("report_job_1")).toBe("Report job available");
    expect(reportBatchJobAvailabilityLabel("No report job")).toBe("No report job");
  });
});
