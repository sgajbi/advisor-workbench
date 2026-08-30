import { describe, expect, it } from "vitest";

import {
  parseReportOrderingResponse,
  type ReportJobListItem,
} from "@/features/report-ordering/contracts";
import {
  applyReportScopeReadiness,
  buildReportOrderingViewModel,
  configurationFingerprint,
  createReportOrderingConfiguration,
  findPortfolioReviewBatchMode,
  selectedReportConfigurationValues,
  selectReportOrderingFamily,
  toReportRequestRows,
} from "@/features/report-ordering/view-model";
import {
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

const sourceContext = {
  asOfDate: "2026-04-22",
  reportingCurrency: "SGD",
  earliestReportDate: "2025-01-06",
  latestReportDate: "2026-04-22",
  reportingCurrencies: ["SGD", "USD"],
};

describe("report ordering view model", () => {
  it("selects the source-ready JSON path while keeping unavailable PDF visible", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    const model = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(configuration.outputFormat).toBe("json");
    expect(model.canSubmit).toBe(true);
    expect(model.readiness.title).toBe("Ready with available outputs");
    expect(model.outputChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "json", available: true }),
        expect.objectContaining({
          id: "pdf",
          available: false,
          supportReason: expect.stringContaining("temporarily unavailable"),
        }),
      ]),
    );
  });

  it("keeps required sections selected and blocks invalid report dates", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    configuration.asOfDate = "not-a-date";
    configuration.selectedSections = [];
    const model = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(model.canSubmit).toBe(false);
    expect(model.readiness.issues).toEqual(
      expect.arrayContaining([
        "Select a valid report date.",
        "Client and mandate profile is required.",
        "Select at least one report section.",
      ]),
    );
  });

  it("blocks report dates outside the source-confirmed portfolio range", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    configuration.asOfDate = "2026-04-23";

    expect(
      buildReportOrderingViewModel(response, configuration, sourceContext).readiness.issues,
    ).toContain("Select a report date from 06 Jan 2025 to 22 Apr 2026.");
  });

  it("blocks reporting currencies not confirmed by the portfolio source", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    configuration.reportingCurrency = "XYZ";

    expect(buildReportOrderingViewModel(response, configuration, sourceContext).readiness.issues).toContain(
      "Select a reporting currency confirmed for this portfolio.",
    );
    expect(
      buildReportOrderingViewModel(response, {
        ...configuration,
        reportingCurrency: "",
      }, sourceContext).canSubmit,
    ).toBe(false);
  });

  it("does not validate reporting currency when the selected family does not publish it", () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies[0].configurationFields =
      payload.reportFamilies[0].configurationFields.filter(
        (field) => field.fieldId !== "reporting_currency",
      );
    const response = parseReportOrderingResponse(payload);
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    configuration.reportingCurrency = "XYZ";

    const model = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(model.canSubmit).toBe(true);
    expect(model.readiness.issues).not.toContain(
      "Select a reporting currency confirmed for this portfolio.",
    );
  });

  it("surfaces permission posture without exposing raw reason codes as primary copy", () => {
    const payload = buildReportOrderingResponse();
    payload.scopeEligibility = {
      state: "permission_blocked",
      reasonCode: "selected_scope_not_entitled",
      message: "The selected portfolio is not available to this user.",
    };
    payload.reportFamilies = [];
    const response = parseReportOrderingResponse(payload);
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    const model = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(model.canSubmit).toBe(false);
    expect(model.readiness.issues.join(" ")).toContain(
      "The selected portfolio is not available to this user.",
    );
    expect(model.readiness.issues.join(" ")).not.toContain(
      "selected_scope_not_entitled",
    );
  });

  it("normalizes set ordering when deciding whether a preflight became stale", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const first = createReportOrderingConfiguration(response, sourceContext);
    first.selectedSections = ["OVERVIEW", "CLIENT_PROFILE"];
    const second = { ...first, selectedSections: ["CLIENT_PROFILE", "OVERVIEW"] };

    expect(configurationFingerprint(first)).toBe(configurationFingerprint(second));
    expect(configurationFingerprint({ ...second, asOfDate: "2026-04-23" })).not.toBe(
      configurationFingerprint(first),
    );
  });

  it("labels completed report data separately from archive and client delivery", () => {
    const rows = toReportRequestRows(buildReportJobListResponse().items);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        reportDate: "22 Apr 2026",
        requestedAt: "22 Apr 2026, 09:00 UTC",
        statusLabel: "Report data complete",
        statusDetail: expect.stringContaining("Archive and client delivery remain separate"),
        tone: "success",
      }),
    );
  });

  it("fails closed when Reporting returns an unmapped lifecycle step", () => {
    const response = buildReportJobListResponse();
    response.items[0].currentStep = "SOMETHING_NEW";

    expect(toReportRequestRows(response.items)[0]).toEqual(
      expect.objectContaining({
        statusLabel: "Status not reported",
        tone: "default",
      }),
    );
  });

  it("explains incomplete source data without exposing a failure code", () => {
    const response = buildReportJobListResponse();
    const item = {
      ...response.items[0],
      status: "failed",
      currentStep: "failed",
      failureCategory: "data_incomplete",
    } as ReportJobListItem;

    const row = toReportRequestRows([item])[0];
    expect(row.statusDetail).toContain("could not be completed from its sources");
    expect(JSON.stringify(row)).not.toContain("data_incomplete");
  });

  it("normalizes report request instants to disclosed UTC and fails closed without a source zone", () => {
    const [request] = buildReportJobListResponse().items;
    const [normalized] = toReportRequestRows([
      { ...request, createdAt: "2026-04-22T17:00:00+08:00" },
    ]);
    const [unconfirmed] = toReportRequestRows([
      { ...request, createdAt: "2026-04-22T09:00:00" },
    ]);

    expect(normalized?.requestedAt).toBe("22 Apr 2026, 09:00 UTC");
    expect(unconfirmed?.requestedAt).toBe("Time unavailable");
    expect(JSON.stringify(unconfirmed)).not.toContain("2026-04-22T09:00:00");
  });

  it("separates directly orderable reports from evidence created by governed workflows", () => {
    const payload = buildReportOrderingResponse();
    const workflowFamily = structuredClone(payload.reportFamilies[0]);
    const response = parseReportOrderingResponse({
      ...payload,
      reportFamilies: [
        ...payload.reportFamilies,
        {
          ...workflowFamily,
          reportFamilyId: "proof_pack",
          businessLabel: "Pre-trade decision evidence",
          orderingModes: [
            {
              modeId: "source_workflow",
              businessLabel: "Advisory workflow",
              description: "Created as part of an approved advisory decision.",
              defaultOutputFormat: "json",
              interactive: false,
              eligibility: {
                state: "ready",
                reasonCode: "source_workflow_ready",
                message: "Created from its source business workflow.",
              },
            },
          ],
        },
      ],
    });
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    const model = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(model.eligibleFamilies.map((family) => family.reportFamilyId)).toEqual([
      "portfolio_review",
    ]);
    expect(model.workflowManagedFamilies.map((family) => family.reportFamilyId)).toEqual([
      "proof_pack",
    ]);
    expect(model.canSubmit).toBe(true);
  });

  it("rebuilds family-owned defaults when selecting another orderable report", () => {
    const payload = buildReportOrderingResponse();
    const alternateFamily = structuredClone(payload.reportFamilies[0]);
    alternateFamily.reportFamilyId = "portfolio_review_condensed";
    alternateFamily.businessLabel = "Condensed portfolio review";
    alternateFamily.sections = [
      {
        ...alternateFamily.sections[0],
        sectionId: "CONDENSED_PROFILE",
        businessLabel: "Condensed client profile",
        dependencyFieldIds: ["advisor_brief_run_id"],
      },
    ];
    const response = parseReportOrderingResponse({
      ...payload,
      reportFamilies: [...payload.reportFamilies, alternateFamily],
    });
    const current = createReportOrderingConfiguration(response, sourceContext);
    current.configurationValues.advisor_brief_run_id = "abr_previous";
    current.allocationDimensions = ["asset_class"];

    const selected = selectReportOrderingFamily(
      response,
      current,
      "portfolio_review_condensed",
    );

    expect(selected).toEqual(
      expect.objectContaining({
        familyId: "portfolio_review_condensed",
        modeId: "single_portfolio",
        selectedSections: ["CONDENSED_PROFILE"],
        configurationValues: { advisor_brief_run_id: "" },
        allocationDimensions: [],
      }),
    );
  });

  it("requires and submits a conditional catalogue field only for its selected section", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    configuration.selectedSections.push("ADVISOR_COMMENTARY");

    expect(
      buildReportOrderingViewModel(response, configuration, sourceContext).readiness.issues,
    ).toContain(
      "Accepted advisor brief is required when Advisor commentary is included.",
    );

    configuration.configurationValues.advisor_brief_run_id = " abr_accepted_1 ";
    expect(
      buildReportOrderingViewModel(response, configuration, sourceContext).canSubmit,
    ).toBe(true);
    expect(selectedReportConfigurationValues(response.reportFamilies[0], configuration)).toEqual({
      advisor_brief_run_id: "abr_accepted_1",
    });

    configuration.selectedSections = configuration.selectedSections.filter(
      (sectionId) => sectionId !== "ADVISOR_COMMENTARY",
    );
    expect(selectedReportConfigurationValues(response.reportFamilies[0], configuration)).toEqual({});
  });

  it("requires a source-published batch capability and at least two selected portfolios", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    const baseModel = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(findPortfolioReviewBatchMode(baseModel.family)?.submission?.path).toBe(
      "/api/v1/report-batches",
    );
    expect(
      applyReportScopeReadiness(baseModel, "explicit_portfolio_batch", [
        "PB_SG_GLOBAL_BAL_001",
      ]).readiness.issues,
    ).toContain("Select at least two portfolios from your book for a portfolio bundle.");
    expect(
      applyReportScopeReadiness(baseModel, "explicit_portfolio_batch", [
        "PB_SG_GLOBAL_BAL_001",
        "PB_SG_INCOME_002",
      ]),
    ).toEqual(expect.objectContaining({ canSubmit: true }));
    expect(
      applyReportScopeReadiness(
        baseModel,
        "explicit_portfolio_batch",
        ["PB_SG_GLOBAL_BAL_001", "PB_SG_INCOME_002"],
        "error",
      ),
    ).toEqual(expect.objectContaining({ canSubmit: false }));
  });

  it("keeps bundle readiness independent when single-portfolio ordering is unavailable", () => {
    const payload = buildReportOrderingResponse();
    const singleMode = payload.reportFamilies[0].orderingModes[0];
    singleMode.interactive = false;
    singleMode.eligibility.state = "unavailable";
    singleMode.eligibility.reasonCode = "single_portfolio_unavailable";
    singleMode.submission.state = "unavailable";
    singleMode.submission.reasonCode = "single_portfolio_unavailable";
    const response = parseReportOrderingResponse(payload);
    const configuration = createReportOrderingConfiguration(response, sourceContext);
    const baseModel = buildReportOrderingViewModel(response, configuration, sourceContext);

    expect(baseModel.family?.reportFamilyId).toBe("portfolio_review");
    expect(baseModel.readiness.issues).toContain(
      "Single-portfolio ordering is not currently available for this report.",
    );
    expect(
      applyReportScopeReadiness(baseModel, "explicit_portfolio_batch", [
        "PB_SG_GLOBAL_BAL_001",
        "PB_SG_INCOME_002",
      ]),
    ).toEqual(expect.objectContaining({
      canSubmit: true,
      readiness: expect.objectContaining({ state: "ready", issues: [] }),
    }));
  });

  it("accepts only the governed selection-required batch capability posture", () => {
    const payload = buildReportOrderingResponse();
    const mode = payload.reportFamilies[0].orderingModes[1];

    mode.eligibility.reasonCode = "report_family_partially_available";
    expect(
      findPortfolioReviewBatchMode(
        parseReportOrderingResponse(payload).reportFamilies[0],
      ),
    ).toBeNull();

    mode.eligibility.reasonCode = "explicit_portfolio_selection_required";
    mode.submission.reasonCode = "report_family_partially_available";
    expect(
      findPortfolioReviewBatchMode(
        parseReportOrderingResponse(payload).reportFamilies[0],
      ),
    ).toBeNull();
  });

  it("fails closed when the published batch path is not the governed Gateway endpoint", () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies[0].orderingModes[1].submission.path = "/api/v1/internal/batches";

    expect(() => parseReportOrderingResponse(payload)).toThrow();
  });
});
