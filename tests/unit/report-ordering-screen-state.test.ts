import { describe, expect, it } from "vitest";

import { buildReportOrderingScreenState } from "@/features/report-ordering/report-ordering-screen-state";
import {
  buildReportOrderingViewModel,
  createReportOrderingConfiguration,
} from "@/features/report-ordering/view-model";
import { parseReportOrderingResponse } from "@/features/report-ordering/contracts";
import { buildReportOrderingResponse } from "../fixtures/report-ordering-fixtures";

const sourceContext = {
  asOfDate: "2026-04-22",
  reportingCurrency: "SGD",
  earliestReportDate: "2025-01-06",
  latestReportDate: "2026-04-22",
  reportingCurrencies: ["SGD", "USD"],
};

function readyModel() {
  const response = parseReportOrderingResponse(buildReportOrderingResponse());
  return buildReportOrderingViewModel(
    response,
    createReportOrderingConfiguration(response, sourceContext),
    sourceContext,
  );
}

describe("report ordering screen state", () => {
  it.each([
    ["loading", "loading", "Loading"],
    ["permission_blocked", "restricted", "Restricted"],
    ["error", "unavailable", "Unavailable"],
  ] as const)(
    "maps %s catalogue state to one terminal %s readiness posture",
    (catalogueState, readinessKind, badgeLabel) => {
      const state = buildReportOrderingScreenState({
        catalogueState,
        catalogueError: null,
        model: null,
        preflightReviewed: false,
        submissionState: "idle",
        submissionError: null,
      });

      expect(state.workspace.kind).toBe(catalogueState);
      expect(state.readiness).toEqual(
        expect.objectContaining({
          kind: readinessKind,
          badgeLabel,
          showRequestSummary: false,
          showActions: false,
          showValidationSummary: false,
        }),
      );
    },
  );

  it("treats a ready catalogue without an orderable report as empty", () => {
    const payload = buildReportOrderingResponse();
    payload.reportFamilies = [];
    const response = parseReportOrderingResponse(payload);
    const model = buildReportOrderingViewModel(
      response,
      createReportOrderingConfiguration(response, sourceContext),
      sourceContext,
    );

    const state = buildReportOrderingScreenState({
      catalogueState: "ready",
      catalogueError: null,
      model,
      preflightReviewed: false,
      submissionState: "idle",
      submissionError: null,
    });

    expect(state.workspace.kind).toBe("empty");
    expect(state.readiness.kind).toBe("empty");
    expect(state.readiness.showActions).toBe(false);
    expect(state.readiness.showValidationSummary).toBe(false);
  });

  it.each([
    [false, "idle", "ready_for_review", "Ready for review"],
    [true, "idle", "reviewed", "Reviewed"],
    [true, "submitting", "submitting", "Submitting"],
    [true, "accepted", "accepted", "Accepted"],
    [true, "error", "not_accepted", "Not accepted"],
  ] as const)(
    "projects review=%s and submission=%s as %s",
    (preflightReviewed, submissionState, readinessKind, badgeLabel) => {
      const state = buildReportOrderingScreenState({
        catalogueState: "ready",
        catalogueError: null,
        model: readyModel(),
        preflightReviewed,
        submissionState,
        submissionError: submissionState === "error" ? "Request failed." : null,
      });

      expect(state.workspace.kind).toBe(
        submissionState === "accepted" ? "accepted" : "configuration",
      );
      expect(state.readiness).toEqual(
        expect.objectContaining({ kind: readinessKind, badgeLabel }),
      );
    },
  );

  it("shows validation guidance only for actionable setup-required states", () => {
    const setupRequiredModel = readyModel();
    setupRequiredModel.readiness.state = "blocked";
    setupRequiredModel.readiness.issues = ["Select a valid report date."];

    const state = buildReportOrderingScreenState({
      catalogueState: "ready",
      catalogueError: null,
      model: setupRequiredModel,
      preflightReviewed: false,
      submissionState: "idle",
      submissionError: null,
    });

    expect(state.workspace.kind).toBe("configuration");
    expect(state.readiness.kind).toBe("setup_required");
    expect(state.readiness.showActions).toBe(true);
    expect(state.readiness.showValidationSummary).toBe(true);
  });
});
