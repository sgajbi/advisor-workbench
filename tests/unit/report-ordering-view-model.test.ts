import { describe, expect, it } from "vitest";

import { parseReportOrderingResponse } from "@/features/report-ordering/contracts";
import {
  buildReportOrderingViewModel,
  configurationFingerprint,
  createReportOrderingConfiguration,
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
});
