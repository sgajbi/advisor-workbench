import { describe, expect, it } from "vitest";

import {
  parseReportJobHandle,
  parseReportJobListResponse,
  parseReportOrderingResponse,
} from "@/features/report-ordering/contracts";

const orderingResponse = {
  contractVersion: "workbench-report-ordering.v1",
  sourceAuthority: "reporting",
  sourceContractVersion: "report-ordering-catalogue.v1",
  scopeSelection: { scopeType: "portfolio", scopeId: "PB_SG_GLOBAL_BAL_001" },
  catalogueAvailability: {
    state: "partial",
    reasonCode: "report_catalogue_partially_available",
    message: "Some report outputs are temporarily unavailable.",
  },
  scopeEligibility: {
    state: "ready",
    reasonCode: "selected_scope_eligible",
    message: "The selected portfolio is available for report ordering.",
  },
  reportFamilies: [
    {
      reportFamilyId: "portfolio_review",
      businessLabel: "Portfolio review report",
      description: "Advisor review pack for a client portfolio.",
      intendedUse: "advisor_client_portfolio_review",
      audienceRoles: ["client_advisor"],
      clientReleasePosture: "advisor_review_required_distribution_not_supported",
      orderingModes: [
        {
          modeId: "single_portfolio",
          businessLabel: "Single portfolio",
          description: "Create one report for the selected portfolio.",
          defaultOutputFormat: "json",
          interactive: true,
          eligibility: {
            state: "ready",
            reasonCode: "single_portfolio_ordering_ready",
            message: "This portfolio can be submitted for report creation.",
          },
          submission: {
            capabilityId: "reporting.portfolio_review.single",
            method: "POST",
            path: "/api/v1/reports/portfolio-reviews",
            state: "ready",
            reasonCode: "single_portfolio_ordering_ready",
          },
        },
      ],
      outputFormats: [
        {
          formatId: "json",
          businessLabel: "Structured data package",
          usePosture: "system_integration",
          state: "ready",
          reasonCode: "report_data_ready",
        },
        {
          formatId: "pdf",
          businessLabel: "Governed PDF document",
          usePosture: "governed_document",
          state: "unavailable",
          reasonCode: "render_metadata_unavailable",
        },
      ],
      configurationFields: [
        {
          fieldId: "as_of_date",
          businessLabel: "Report date",
          description: "Business date for reporting evidence.",
          inputType: "business_date",
          requirement: "required",
          defaultingPolicy: "caller_required",
          valueSource: "caller",
          options: [],
        },
      ],
      sections: [
        {
          sectionId: "CLIENT_PROFILE",
          businessLabel: "Client and mandate profile",
          description: "Client and mandate context.",
          displayOrder: 10,
          selectionPosture: "required",
          defaultSelected: true,
          dependencyFieldIds: [],
        },
      ],
      availability: {
        state: "partial",
        reasonCode: "report_family_partially_available",
        message: "Available with a reduced set of output formats.",
      },
      eligibility: {
        state: "ready",
        reasonCode: "report_family_eligible",
        message: "This report family is available.",
      },
    },
  ],
} as const;

describe("report ordering contracts", () => {
  it("accepts the governed Workbench ordering shape and independent format states", () => {
    const parsed = parseReportOrderingResponse(orderingResponse);

    expect(parsed.reportFamilies[0].outputFormats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formatId: "json", state: "ready" }),
        expect.objectContaining({ formatId: "pdf", state: "unavailable" }),
      ]),
    );
  });

  it("fails closed when the Gateway contract contains an unknown primary field", () => {
    expect(() =>
      parseReportOrderingResponse({ ...orderingResponse, sourceService: "lotus-report" }),
    ).toThrow();
  });

  it("fails closed for unsupported submission paths", () => {
    const altered = structuredClone(orderingResponse) as Record<string, unknown>;
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

    const history = parseReportJobListResponse({
      count: 1,
      appliedFilters: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      items: [
        {
          reportJobId: "rjob_1",
          reportRequestId: "rrq_1",
          reportType: "portfolio_review",
          tenantId: "tenant-sg",
          region: "APAC",
          portfolioScope: { portfolio_ids: ["PB_SG_GLOBAL_BAL_001"] },
          asOfDate: "2026-04-22",
          status: "completed",
          failureCategory: null,
          currentStep: "completed",
          retryEligible: false,
          cancelRequested: false,
          idempotencyKey: "intent_1",
          correlationId: "corr_1",
          createdAt: "2026-04-22T09:00:00Z",
          updatedAt: "2026-04-22T09:01:00Z",
        },
      ],
    });

    expect(history.items[0].portfolioScope.portfolio_ids).toEqual([
      "PB_SG_GLOBAL_BAL_001",
    ]);
  });
});
