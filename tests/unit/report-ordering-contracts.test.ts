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

  it("accepts catalogue-driven conditional text fields without relaxing the contract", () => {
    const parsed = parseReportOrderingResponse(buildReportOrderingResponse());

    expect(parsed.reportFamilies[0].configurationFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "advisor_brief_run_id",
          inputType: "text",
          requirement: "conditional",
        }),
      ]),
    );
    expect(parsed.reportFamilies[0].sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: "ADVISOR_COMMENTARY",
          dependencyFieldIds: ["advisor_brief_run_id"],
        }),
      ]),
    );
  });

  it.each([
    ["as_of_date", "business_date"],
    ["reporting_currency", "currency"],
    ["benchmark_code", "benchmark"],
    ["allocation_dimensions", "multi_select"],
  ])(
    "rejects a conditional %s field that the ordering form cannot collect",
    (fieldId, inputType) => {
      const response = buildReportOrderingResponse();
      response.reportFamilies[0].configurationFields.push({
        fieldId,
        businessLabel: "Unsupported conditional evidence",
        description: "Evidence that must not be silently omitted.",
        inputType,
        requirement: "conditional",
        defaultingPolicy: "caller_required_when_section_selected",
        valueSource: "caller",
        options: [],
      });

      expect(() => parseReportOrderingResponse(response)).toThrow();
    },
  );

  it.each([
    ["benchmark_code", "benchmark"],
    ["allocation_dimensions", "multi_select"],
  ])(
    "rejects a required %s field whose empty state the form cannot enforce",
    (fieldId, inputType) => {
      const response = buildReportOrderingResponse();
      const field = response.reportFamilies[0].configurationFields.find(
        (candidate) => candidate.fieldId === fieldId,
      );
      if (!field) throw new Error(`Fixture field ${fieldId} is missing`);
      field.inputType = inputType;
      field.requirement = "required";

      expect(() => parseReportOrderingResponse(response)).toThrow();
    },
  );

  it.each([
    ["valuation_date", "business_date"],
    ["settlement_currency", "currency"],
    ["grouping_dimensions", "multi_select"],
  ])(
    "rejects an unimplemented non-text catalogue field %s",
    (fieldId, inputType) => {
      const response = buildReportOrderingResponse();
      response.reportFamilies[0].configurationFields.push({
        fieldId,
        businessLabel: "Unimplemented field",
        description: "A field without a matching Workbench control.",
        inputType,
        requirement: "optional",
        defaultingPolicy: "caller_optional",
        valueSource: "caller",
        options: [],
      });

      expect(() => parseReportOrderingResponse(response)).toThrow();
    },
  );

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

  it.each([
    ["a mismatched item count", (response: ReturnType<typeof buildReportBatchStatus>) => {
      response.item_count = 3;
    }],
    ["duplicate materialized portfolios", (response: ReturnType<typeof buildReportBatchStatus>) => {
      response.materialized_portfolio_ids[1] = response.materialized_portfolio_ids[0];
    }],
    ["duplicate outcome positions", (response: ReturnType<typeof buildReportBatchStatus>) => {
      response.items[1].item_position = response.items[0].item_position;
    }],
    ["duplicate outcome portfolios", (response: ReturnType<typeof buildReportBatchStatus>) => {
      response.items[1].portfolio_id = response.items[0].portfolio_id;
    }],
    ["an outcome outside the materialized selection", (response: ReturnType<typeof buildReportBatchStatus>) => {
      response.items[1].portfolio_id = "PB_SG_UNREVIEWED_003";
    }],
  ])("fails closed when batch status contains %s", (_scenario, mutateResponse) => {
    const response = buildReportBatchStatus();
    mutateResponse(response);

    expect(() => parseReportBatchStatus(response)).toThrow();
  });
});
