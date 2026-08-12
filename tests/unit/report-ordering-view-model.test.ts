import { describe, expect, it } from "vitest";

import { parseReportOrderingResponse } from "@/features/report-ordering/contracts";
import {
  applyReportScopeReadiness,
  buildReportOrderingViewModel,
  configurationFingerprint,
  createReportOrderingConfiguration,
  findPortfolioReviewBatchMode,
  selectReportOrderingFamily,
  toReportRequestRows,
} from "@/features/report-ordering/view-model";
import {
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

describe("report ordering view model", () => {
  it("selects the source-ready JSON path while keeping unavailable PDF visible", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
    const model = buildReportOrderingViewModel(response, configuration);

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
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "not-a-date",
      reportingCurrency: "SGD",
    });
    configuration.selectedSections = [];
    const model = buildReportOrderingViewModel(response, configuration);

    expect(model.canSubmit).toBe(false);
    expect(model.readiness.issues).toEqual(
      expect.arrayContaining([
        "Select a valid report date.",
        "Client and mandate profile is required.",
        "Select at least one report section.",
      ]),
    );
  });

  it("blocks incomplete reporting currency codes while preserving the optional default", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SG",
    });

    expect(buildReportOrderingViewModel(response, configuration).readiness.issues).toContain(
      "Enter a three-letter reporting currency, such as SGD or USD.",
    );
    expect(
      buildReportOrderingViewModel(response, {
        ...configuration,
        reportingCurrency: "",
      }).canSubmit,
    ).toBe(true);
  });

  it("does not validate reporting currency when the selected family does not publish it", () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies[0].configurationFields =
      payload.reportFamilies[0].configurationFields.filter(
        (field) => field.fieldId !== "reporting_currency",
      );
    const response = parseReportOrderingResponse(payload);
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SG",
    });

    const model = buildReportOrderingViewModel(response, configuration);

    expect(model.canSubmit).toBe(true);
    expect(model.readiness.issues).not.toContain(
      "Enter a three-letter reporting currency, such as SGD or USD.",
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
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
    const model = buildReportOrderingViewModel(response, configuration);

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
    const first = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
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
        statusLabel: "Report data complete",
        statusDetail: expect.stringContaining("Archive and client delivery remain separate"),
        tone: "success",
      }),
    );
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
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
    const model = buildReportOrderingViewModel(response, configuration);

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
      },
    ];
    const response = parseReportOrderingResponse({
      ...payload,
      reportFamilies: [...payload.reportFamilies, alternateFamily],
    });
    const current = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
    current.benchmarkCode = "BENCHMARK_OLD";
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
        benchmarkCode: "",
        allocationDimensions: [],
      }),
    );
  });

  it("requires a source-published batch capability and at least two selected portfolios", () => {
    const response = parseReportOrderingResponse(buildReportOrderingResponse());
    const configuration = createReportOrderingConfiguration(response, {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });
    const baseModel = buildReportOrderingViewModel(response, configuration);

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
